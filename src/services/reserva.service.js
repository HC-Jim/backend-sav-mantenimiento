const reservaRepo = require('../repositories/reserva.repository');
const vehiculoRepo = require('../repositories/vehiculo.repository');
const busqueda = require('./busqueda.service');          // <<include>> Buscar Vehiculo
const comprobante = require('./comprobante.service');     // <<include>> Emitir Comprobante
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
    return busqueda.buscarVehiculo(vehiculoId); // <<include>> Buscar Vehiculo
  }

  async verificarDisponibilidad(vehiculoId, fechaInicio, fechaFin) {
    this.#validarFechas(fechaInicio, fechaFin);
    const v = await busqueda.buscarVehiculo(vehiculoId); // <<include>> Buscar Vehiculo
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

    const vehiculo = await busqueda.buscarVehiculo(vehiculo_id); // <<include>> Buscar Vehiculo

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
    // <<include>> Emitir Comprobante
    const comp = await comprobante.emitir({ pago_id: pago.id, monto_total: reserva.garantiaMonto });

    const actualizada = await reservaRepo.actualizar(reserva.id, { estado: EstadoReserva.CONFIRMADA });
    await vehiculoRepo.actualizarEstado(reserva.vehiculoId, 'ALQUILADO');
    return { reserva: actualizada, pago, comprobante: comp };
  }

  // ============ APROBAR RESERVA (Cajero) -> CONFIRMADA ============
  // El Cajero acepta la orden de reserva y emite el comprobante que demuestra
  // el pago de la garantia. Recien ahi el vehiculo queda ALQUILADO.
  async aprobarReserva(usuario, reservaId) {
    this.#exigirCajero(usuario);
    const reserva = await this.#reservaValidada('aprobar_reserva', usuario, reservaId);

    let comp = null;
    if (reserva.cotizacionId) {
      const pagos = await reservaRepo.pagosDeCotizacion(reserva.cotizacionId);
      const pagoGarantia = pagos.find((p) => p.concepto === 'GARANTIA');
      if (pagoGarantia) {
        // <<include>> Emitir Comprobante (reserva)
        comp = await comprobante.emitir({ pago_id: pagoGarantia.id, monto_total: reserva.montoTotalEstimado });
      }
    }
    const actualizada = await reservaRepo.actualizar(reserva.id, { estado: EstadoReserva.CONFIRMADA });
    await vehiculoRepo.actualizarEstado(reserva.vehiculoId, 'ALQUILADO');
    return { reserva: actualizada, comprobante: comp };
  }

  // ============ COBRAR DIAS EXTRA (Cajero) ============
  // Cargo por retraso: dias extra x precio por dia (segun la tarifa pactada) + comprobante.
  async cobrarDiasExtra(usuario, reservaId, { dias } = {}) {
    this.#exigirCajero(usuario);
    const reserva = await reservaRepo.buscarPorId(reservaId);
    if (!reserva) throw AppError.notFound('Reserva no encontrada');
    const n = Math.trunc(Number(dias) || 0);
    if (n <= 0) throw AppError.badRequest('Los dias extra deben ser mayor a 0');

    const diasPactados = Math.max(PoliticasAlquiler.diasEntre(reserva.fechaInicio, reserva.fechaFin), 1);
    const tarifaDia = reserva.montoTotalEstimado / diasPactados;
    const monto = Number((tarifaDia * n).toFixed(2));

    const pago = await reservaRepo.crearPago({
      reserva_id: reserva.id, monto, concepto: 'EXTRA', metodo: 'TARJETA', estado: 'PAGADO'
    });
    // <<include>> Emitir Comprobante (dias extra)
    const comp = await comprobante.emitir({ pago_id: pago.id, monto_total: monto });
    return { dias: n, tarifa_dia: Number(tarifaDia.toFixed(2)), monto, comprobante: comp };
  }

  // ============ PAGAR ALQUILER (Cliente/Cajero) -> EN_CURSO ============
  // Registra el pago del alquiler y entrega el vehiculo. La garantia queda
  // retenida; el Cajero la devuelve luego con "Devolver Garantia".
  async pagarAlquiler(usuario, reservaId, { metodo } = {}) {
    const reserva = await this.#reservaValidada('pagar_alquiler', usuario, reservaId);

    const pagoAlquiler = await reservaRepo.crearPago({
      reserva_id: reserva.id,
      monto: reserva.montoTotalEstimado,
      concepto: 'ALQUILER',
      metodo: metodo || 'TARJETA',
      estado: 'PAGADO'
    });
    // <<include>> Emitir Comprobante
    const comp = await comprobante.emitir({ pago_id: pagoAlquiler.id, monto_total: reserva.montoTotalEstimado });

    const actualizada = await reservaRepo.actualizar(reserva.id, { estado: EstadoReserva.EN_CURSO });
    return { reserva: actualizada, pago_alquiler: pagoAlquiler, comprobante: comp };
  }

  // ============ DEVOLVER GARANTIA (Cajero) -> FINALIZADA ============
  // <<include>> Pagar Garantia: requiere que la garantia haya sido pagada.
  async devolverGarantia(usuario, reservaId, { metodo, deducciones = 0 } = {}) {
    this.#exigirCajero(usuario);
    const reserva = await this.#reservaValidada('devolver_garantia', usuario, reservaId);

    // <<include>> Pagar Garantia: verificar el pago de garantia del cliente
    const pagos = await reservaRepo.pagosDeReserva(reserva.id);
    if (!pagos.some((p) => p.concepto === 'GARANTIA')) {
      throw AppError.conflict('No existe un pago de garantia registrado para esta reserva');
    }

    const ded = Math.max(Number(deducciones) || 0, 0);
    const devolucion = Math.max(reserva.garantiaMonto - ded, 0);

    // Registro del alquiler (entrega/devolucion del vehiculo)
    await reservaRepo.crearAlquiler({
      reserva_id: reserva.id,
      vehiculo_id: reserva.vehiculoId,
      fecha_hora_entrega: reserva.fechaInicio,
      fecha_hora_devolucion: new Date().toISOString(),
      estado: 'FINALIZADO'
    });

    const pagoDevolucion = await reservaRepo.crearPago({
      reserva_id: reserva.id, monto: devolucion, concepto: 'DEVOLUCION', metodo: metodo || 'TARJETA', estado: 'PAGADO'
    });
    // <<include>> Emitir Comprobante
    const comp = await comprobante.emitir({ pago_id: pagoDevolucion.id, monto_total: devolucion });

    const actualizada = await reservaRepo.actualizar(reserva.id, {
      estado: EstadoReserva.FINALIZADA,
      penalidad: ded,
      monto_devuelto: devolucion
    });
    await vehiculoRepo.actualizarEstado(reserva.vehiculoId, 'DISPONIBLE');
    return { reserva: actualizada, devolucion, deducciones: ded, comprobante: comp };
  }

  // ============ EMITIR COMPROBANTE (Cajero) ============
  // <<include>> Pagar Alquiler: emite el comprobante del pago de alquiler.
  async emitirComprobante(usuario, reservaId) {
    this.#exigirCajero(usuario);
    const reserva = await reservaRepo.buscarPorId(reservaId);
    if (!reserva) throw AppError.notFound('Reserva no encontrada');

    const pagos = await reservaRepo.pagosDeReserva(reservaId);
    const pagoAlquiler = pagos.find((p) => p.concepto === 'ALQUILER');
    if (!pagoAlquiler) {
      throw AppError.conflict('Aun no se ha registrado el pago de alquiler de esta reserva');
    }
    const comp = await comprobante.emitir({ pago_id: pagoAlquiler.id, monto_total: pagoAlquiler.monto });
    const comprobantes = await reservaRepo.comprobantesDeReserva(reservaId);
    return { comprobante: comp, comprobantes };
  }

  async listarComprobantes(usuario, reservaId) {
    this.#exigirCajero(usuario);
    return reservaRepo.comprobantesDeReserva(reservaId);
  }

  // ============ GESTIONAR CANCELACION (Cajero) ============
  // <<include>> Cancelar Reserva: aplica la regla de 48h y emite comprobante.
  async gestionarCancelacion(usuario, reservaId, { motivo } = {}) {
    this.#exigirCajero(usuario);
    const reserva = await this.#reservaValidada('gestionar_cancelacion', usuario, reservaId);

    const horasRestantes = (new Date(reserva.fechaInicio) - new Date()) / (1000 * 60 * 60);
    const conPenalidad = horasRestantes < PoliticasAlquiler.HORAS_LIMITE_CANCELACION;
    const penalidad = conPenalidad
      ? Number((reserva.garantiaMonto * PoliticasAlquiler.PORCENTAJE_PENALIDAD).toFixed(2))
      : 0;
    const devolucion = Math.max(reserva.garantiaMonto - penalidad, 0);

    let comp = null;
    if (devolucion > 0) {
      const pagoDev = await reservaRepo.crearPago({
        reserva_id: reserva.id, monto: devolucion, concepto: 'DEVOLUCION', metodo: 'TARJETA', estado: 'PAGADO'
      });
      // <<include>> Emitir Comprobante
      comp = await comprobante.emitir({ pago_id: pagoDev.id, monto_total: devolucion });
    }

    const actualizada = await reservaRepo.actualizar(reserva.id, {
      estado: EstadoReserva.CANCELADA,
      penalidad,
      monto_devuelto: devolucion,
      motivo_cancelacion: motivo || 'Cancelacion gestionada en ventanilla (Cajero)',
      fecha_cancelacion: new Date().toISOString()
    });
    await vehiculoRepo.actualizarEstado(reserva.vehiculoId, 'DISPONIBLE');
    return { reserva: actualizada, penalidad, devolucion, con_penalidad: conPenalidad, comprobante: comp };
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
      const pagoDev = await reservaRepo.crearPago({
        reserva_id: reserva.id, monto: devolucion, concepto: 'DEVOLUCION', metodo: 'TARJETA', estado: 'PAGADO'
      });
      // <<include>> Emitir Comprobante (de la cancelacion / devolucion)
      await comprobante.emitir({ pago_id: pagoDev.id, monto_total: devolucion });
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

  #exigirCajero(usuario) {
    if (usuario.rol !== Rol.CAJERO) {
      throw AppError.forbidden('Esta accion solo la realiza el Cajero');
    }
  }

  #verificarPropiedad(usuario, reserva) {
    if (usuario.rol === Rol.CLIENTE && reserva.clienteId !== usuario.clienteId) {
      throw AppError.forbidden('No puedes acceder a una reserva de otro cliente');
    }
  }

  async #reservaValidada(accion, usuario, reservaId) {
    const reserva = await reservaRepo.buscarPorId(reservaId);
    if (!reserva) throw AppError.notFound('Reserva no encontrada');
    // Cliente: solo su propia reserva. Cajero: cualquiera (atencion en ventanilla).
    if (usuario.rol === Rol.CLIENTE) {
      if (!usuario.clienteId || reserva.clienteId !== usuario.clienteId) {
        throw AppError.forbidden('No puedes operar una reserva de otro cliente');
      }
    } else if (usuario.rol !== Rol.CAJERO) {
      throw AppError.forbidden('Esta accion la realiza el Cliente o el Cajero');
    }
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
