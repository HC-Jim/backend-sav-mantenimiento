const reservaRepo = require('../repositories/reserva.repository');
const vehiculoRepo = require('../repositories/vehiculo.repository');
const busqueda = require('./busqueda.service');          // <<include>> Buscar Vehiculo
const comprobante = require('./comprobante.service');     // <<include>> Emitir Comprobante
const precioService = require('./precio.service');        // precio por dia (normal/campania)
const PoliticasAlquiler = require('../domain/PoliticasAlquiler');
const { EstadoReserva, MaquinaReserva } = require('../domain/EstadoReserva');
const { Rol } = require('../domain/EstadoOrden');
const AppError = require('../utils/AppError');

/**
 * Proceso de reserva (Cliente):
 *   1. Generar Orden de Reserva          -> estado POR_PAGAR
 *   2. Registrar Pago de Orden de Reserva -> garantia + alquiler -> RESERVADO
 *      (emite el comprobante como parte del pago).
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

  // ============ 1. GENERAR ORDEN DE RESERVA (Cliente) ============
  // El Cliente busca el vehiculo y genera la orden; queda POR_PAGAR.
  async generarOrdenReserva(usuario, { vehiculo_id, fecha_inicio, fecha_fin }) {
    const clienteId = this.#exigirCliente(usuario);
    if (!vehiculo_id) throw AppError.badRequest('vehiculo_id es obligatorio');
    this.#validarFechas(fecha_inicio, fecha_fin);

    const vehiculo = await busqueda.buscarVehiculo(vehiculo_id); // <<include>> Buscar Vehiculo
    const disp = await this.verificarDisponibilidad(vehiculo_id, fecha_inicio, fecha_fin);
    if (!disp.disponible) throw AppError.conflict(disp.motivo);

    const dias = PoliticasAlquiler.diasEntre(fecha_inicio, fecha_fin);
    const { tarifa } = precioService.tarifaPara(vehiculo, dias); // precio normal/campania

    return reservaRepo.crear({
      cliente_id: clienteId,
      vehiculo_id,
      fecha_inicio,
      fecha_fin,
      estado: EstadoReserva.POR_PAGAR,
      monto_total_estimado: tarifa * dias,
      garantia_monto: tarifa * PoliticasAlquiler.FACTOR_GARANTIA
    });
  }

  // ============ CONSULTAS ============
  async misReservas(usuario) {
    const clienteId = this.#exigirCliente(usuario);
    return reservaRepo.listarPorCliente(clienteId);
  }

  async obtenerReserva(usuario, reservaId) {
    const reserva = await reservaRepo.buscarPorId(reservaId);
    if (!reserva) throw AppError.notFound('Reserva no encontrada');
    this.#verificarPropiedad(usuario, reserva);
    return reserva;
  }

  // ============ 2. PAGAR ORDEN DE RESERVA (Cliente) ============
  // Un solo paso: paga la garantia y el alquiler; la reserva queda RESERVADO
  // y el vehiculo ALQUILADO.
  async pagarOrdenReserva(usuario, reservaId, { metodo } = {}) {
    const reserva = await this.#reservaValidada('pagar_orden', usuario, reservaId);
    const met = metodo || 'TARJETA';

    const pagoGarantia = await reservaRepo.crearPago({
      reserva_id: reserva.id, monto: reserva.garantiaMonto,
      concepto: 'GARANTIA', metodo: met, estado: 'PAGADO'
    });
    const pagoAlquiler = await reservaRepo.crearPago({
      reserva_id: reserva.id, monto: reserva.montoTotalEstimado,
      concepto: 'ALQUILER', metodo: met, estado: 'PAGADO'
    });
    // <<include>> Emitir Comprobante (por el total pagado)
    const total = Number(reserva.garantiaMonto) + Number(reserva.montoTotalEstimado);
    const comp = await comprobante.emitir({ pago_id: pagoAlquiler.id, monto_total: total });

    const actualizada = await reservaRepo.actualizar(reserva.id, { estado: EstadoReserva.RESERVADO });
    await vehiculoRepo.actualizarEstado(reserva.vehiculoId, 'ALQUILADO');
    return { reserva: actualizada, pago_garantia: pagoGarantia, pago_alquiler: pagoAlquiler, comprobante: comp };
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
    const reserva = await reservaRepo.buscarPorId(reservaId);
    if (!reserva) throw AppError.notFound('Reserva no encontrada');
    if (usuario.rol !== Rol.CLIENTE || !usuario.clienteId || reserva.clienteId !== usuario.clienteId) {
      throw AppError.forbidden('No puedes operar una reserva de otro cliente');
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
