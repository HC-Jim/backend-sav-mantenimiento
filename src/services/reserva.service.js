const reservaRepo = require('../repositories/reserva.repository');
const vehiculoRepo = require('../repositories/vehiculo.repository');
const PoliticasAlquiler = require('../domain/PoliticasAlquiler');
const { EstadoReserva, MaquinaReserva } = require('../domain/EstadoReserva');
const { Rol } = require('../domain/EstadoOrden');
const AppError = require('../utils/AppError');

/**
 * Orquesta el proceso de alquiler visto por el Cliente:
 * catalogo, reserva, pago de garantia, pago del alquiler + devolucion de
 * garantia y cancelacion con penalidad.
 *
 * La "pasarela de pago" esta simulada: todo pago se registra como PAGADO.
 */
class ReservaService {
  // ============ CATALOGO ============
  async catalogo(soloDisponibles = true) {
    return vehiculoRepo.listar({ soloDisponibles });
  }

  async detalleVehiculo(vehiculoId) {
    const v = await vehiculoRepo.buscarPorId(vehiculoId);
    if (!v) throw AppError.notFound('Vehiculo no encontrado');
    return v;
  }

  async verificarDisponibilidad(vehiculoId, fechaInicio, fechaFin) {
    this.#validarFechas(fechaInicio, fechaFin);
    const v = await vehiculoRepo.buscarPorId(vehiculoId);
    if (!v) throw AppError.notFound('Vehiculo no encontrado');
    if (v.estado === 'EN_MANTENIMIENTO') {
      return { disponible: false, motivo: 'El vehiculo esta en mantenimiento' };
    }
    const solapan = await reservaRepo.reservasQueSolapan(vehiculoId, fechaInicio, fechaFin);
    if (solapan.length > 0) {
      return { disponible: false, motivo: 'El vehiculo ya esta reservado en esas fechas' };
    }
    return { disponible: true };
  }

  // ============ CREAR RESERVA ============
  async crearReserva(usuario, { vehiculo_id, fecha_inicio, fecha_fin }) {
    const clienteId = this.#exigirCliente(usuario);
    if (!vehiculo_id) throw AppError.badRequest('vehiculo_id es obligatorio');
    this.#validarFechas(fecha_inicio, fecha_fin);

    const vehiculo = await vehiculoRepo.buscarPorId(vehiculo_id);
    if (!vehiculo) throw AppError.notFound('Vehiculo no encontrado');

    const disp = await this.verificarDisponibilidad(vehiculo_id, fecha_inicio, fecha_fin);
    if (!disp.disponible) throw AppError.conflict(disp.motivo);

    const dias = PoliticasAlquiler.diasEntre(fecha_inicio, fecha_fin);
    const tarifa = vehiculo.tarifaDiaria || 0;

    return reservaRepo.crear({
      cliente_id: clienteId,
      vehiculo_id,
      fecha_inicio,
      fecha_fin,
      estado: EstadoReserva.PENDIENTE_PAGO_GARANTIA,
      monto_total_estimado: tarifa * dias,
      garantia_monto: tarifa * PoliticasAlquiler.FACTOR_GARANTIA
    });
  }

  // ============ CONSULTAS ============
  async misReservas(usuario) {
    const clienteId = this.#exigirCliente(usuario);
    return reservaRepo.listarPorCliente(clienteId);
  }

  async listarTodas() {
    return reservaRepo.listarTodas();
  }

  async obtenerReserva(usuario, reservaId) {
    const reserva = await reservaRepo.buscarPorId(reservaId);
    if (!reserva) throw AppError.notFound('Reserva no encontrada');
    this.#verificarPropiedad(usuario, reserva);
    return reserva;
  }

  // ============ PAGAR GARANTIA (confirma la reserva) ============
  async pagarGarantia(usuario, reservaId, { metodo } = {}) {
    const reserva = await this.#reservaValidada('pagar_garantia', usuario, reservaId);

    const pago = await reservaRepo.crearPago({
      reserva_id: reserva.id,
      monto: reserva.garantiaMonto,
      concepto: 'GARANTIA',
      metodo: metodo || 'TARJETA',
      estado: 'PAGADO'
    });
    const comprobante = await reservaRepo.crearComprobante({
      pago_id: pago.id,
      tipo: 'BOLETA',
      monto_total: reserva.garantiaMonto
    });

    const actualizada = await reservaRepo.actualizar(reserva.id, { estado: EstadoReserva.CONFIRMADA });
    await vehiculoRepo.actualizarEstado(reserva.vehiculoId, 'ALQUILADO');
    return { reserva: actualizada, pago, comprobante };
  }

  // ============ PAGAR ALQUILER + DEVOLVER GARANTIA (finaliza) ============
  async pagarAlquilerYDevolver(usuario, reservaId, { metodo, deducciones = 0 } = {}) {
    const reserva = await this.#reservaValidada('pagar_alquiler', usuario, reservaId);
    const ded = Math.max(Number(deducciones) || 0, 0);

    // Pago del alquiler
    const pagoAlquiler = await reservaRepo.crearPago({
      reserva_id: reserva.id,
      monto: reserva.montoTotalEstimado,
      concepto: 'ALQUILER',
      metodo: metodo || 'TARJETA',
      estado: 'PAGADO'
    });
    await reservaRepo.crearComprobante({
      pago_id: pagoAlquiler.id, tipo: 'BOLETA', monto_total: reserva.montoTotalEstimado
    });

    // Registro del alquiler (entrega/devolucion en esta demo ocurren al finalizar)
    const ahora = new Date().toISOString();
    await reservaRepo.crearAlquiler({
      reserva_id: reserva.id,
      vehiculo_id: reserva.vehiculoId,
      fecha_hora_entrega: reserva.fechaInicio,
      fecha_hora_devolucion: ahora,
      estado: 'FINALIZADO'
    });

    // Devolucion de garantia (menos deducciones por daños, si las hay)
    const devolucion = Math.max(reserva.garantiaMonto - ded, 0);
    const pagoDevolucion = await reservaRepo.crearPago({
      reserva_id: reserva.id, monto: devolucion, concepto: 'DEVOLUCION', metodo: metodo || 'TARJETA', estado: 'PAGADO'
    });

    const actualizada = await reservaRepo.actualizar(reserva.id, {
      estado: EstadoReserva.FINALIZADA,
      penalidad: ded,
      monto_devuelto: devolucion
    });
    await vehiculoRepo.actualizarEstado(reserva.vehiculoId, 'DISPONIBLE');
    return { reserva: actualizada, pago_alquiler: pagoAlquiler, devolucion: pagoDevolucion.monto, deducciones: ded };
  }

  // ============ CANCELAR RESERVA (con regla de 48h) ============
  async cancelarReserva(usuario, reservaId, { motivo } = {}) {
    const reserva = await this.#reservaValidada('cancelar', usuario, reservaId);

    const horasRestantes = (new Date(reserva.fechaInicio) - new Date()) / (1000 * 60 * 60);
    const conPenalidad = horasRestantes < PoliticasAlquiler.HORAS_LIMITE_CANCELACION;
    const penalidad = conPenalidad
      ? Number((reserva.garantiaMonto * PoliticasAlquiler.PORCENTAJE_PENALIDAD).toFixed(2))
      : 0;
    const devolucion = Math.max(reserva.garantiaMonto - penalidad, 0);

    if (devolucion > 0) {
      await reservaRepo.crearPago({
        reserva_id: reserva.id, monto: devolucion, concepto: 'DEVOLUCION', metodo: 'TARJETA', estado: 'PAGADO'
      });
    }

    const actualizada = await reservaRepo.actualizar(reserva.id, {
      estado: EstadoReserva.CANCELADA,
      penalidad,
      monto_devuelto: devolucion,
      motivo_cancelacion: motivo || 'Cancelacion voluntaria del cliente',
      fecha_cancelacion: new Date().toISOString()
    });
    await vehiculoRepo.actualizarEstado(reserva.vehiculoId, 'DISPONIBLE');
    return { reserva: actualizada, penalidad, devolucion, con_penalidad: conPenalidad };
  }

  // ============ Helpers privados ============
  #exigirCliente(usuario) {
    if (usuario.rol !== Rol.CLIENTE || !usuario.clienteId) {
      throw AppError.forbidden('Esta accion solo la realiza un Cliente');
    }
    return usuario.clienteId;
  }

  #verificarPropiedad(usuario, reserva) {
    if (usuario.rol === Rol.CLIENTE && reserva.clienteId !== usuario.clienteId) {
      throw AppError.forbidden('No puedes acceder a una reserva de otro cliente');
    }
  }

  async #reservaValidada(accion, usuario, reservaId) {
    this.#exigirCliente(usuario);
    const reserva = await reservaRepo.buscarPorId(reservaId);
    if (!reserva) throw AppError.notFound('Reserva no encontrada');
    this.#verificarPropiedad(usuario, reserva);
    const { ok, motivo } = MaquinaReserva.validar(accion, reserva.estado);
    if (!ok) throw AppError.conflict(motivo);
    return reserva;
  }

  #validarFechas(inicio, fin) {
    if (!inicio || !fin) throw AppError.badRequest('fecha_inicio y fecha_fin son obligatorias');
    if (new Date(fin) < new Date(inicio)) {
      throw AppError.badRequest('La fecha fin no puede ser anterior a la fecha inicio');
    }
  }
}

module.exports = new ReservaService();
