const cotizacionRepo = require('../repositories/cotizacion.repository');
const reservaRepo = require('../repositories/reserva.repository');
const vehiculoRepo = require('../repositories/vehiculo.repository');
const busqueda = require('./busqueda.service');        // <<include>> Buscar Vehiculo / Buscar Cliente
const comprobante = require('./comprobante.service');   // <<include>> Emitir Comprobante
const precioService = require('./precio.service');      // precio por categoria (normal/campania)
const PoliticasAlquiler = require('../domain/PoliticasAlquiler');
const { EstadoCotizacion, MaquinaCotizacion } = require('../domain/EstadoCotizacion');
const { EstadoReserva } = require('../domain/EstadoReserva');
const { Rol } = require('../domain/EstadoOrden');
const AppError = require('../utils/AppError');

/**
 * Flujo de ventas: Cotizacion -> (cliente acepta) -> (asesor solicita garantia)
 * -> (cliente paga garantia) -> (asesor genera la Orden de Reserva).
 */
class CotizacionService {
  // ============ ASESOR: Generar Cotizacion ============
  async generarCotizacion(usuario, { cliente_id, vehiculo_id, fecha_inicio, fecha_fin }) {
    this.#exigirAsesor(usuario);
    if (!cliente_id || !vehiculo_id) throw AppError.badRequest('cliente_id y vehiculo_id son obligatorios');
    if (!fecha_inicio || !fecha_fin) throw AppError.badRequest('fecha_inicio y fecha_fin son obligatorias');

    await busqueda.buscarCliente(cliente_id);                 // <<include>> Buscar Cliente
    const vehiculo = await busqueda.buscarVehiculo(vehiculo_id); // <<include>> Buscar Vehiculo

    // Consultar disponibilidad
    if (vehiculo.estado === 'EN_MANTENIMIENTO') {
      throw AppError.conflict('El vehiculo esta en mantenimiento');
    }
    const solapan = await reservaRepo.reservasQueSolapan(vehiculo_id, fecha_inicio, fecha_fin);
    if (solapan.length > 0) throw AppError.conflict('El vehiculo ya esta reservado en esas fechas');

    const dias = PoliticasAlquiler.diasEntre(fecha_inicio, fecha_fin);
    const { tarifa } = await precioService.tarifaPara(vehiculo.categoria, dias);

    return cotizacionRepo.crear({
      cliente_id,
      vehiculo_id,
      asesor_id: usuario.id,
      fecha_inicio,
      fecha_fin,
      dias,
      tarifa_dia: tarifa,
      monto_total_estimado: tarifa * dias,
      garantia_monto: tarifa * PoliticasAlquiler.FACTOR_GARANTIA,
      estado: EstadoCotizacion.PENDIENTE
    });
  }

  // ============ Consultas ============
  async misCotizaciones(usuario) {
    const clienteId = this.#exigirCliente(usuario);
    return cotizacionRepo.listarPorCliente(clienteId);
  }

  async listarTodas() {
    return cotizacionRepo.listarTodas();
  }

  // ============ CLIENTE: Aceptar / Rechazar ============
  async decidir(usuario, cotizacionId, aceptar) {
    const cot = await this.#cotizacionCliente(usuario, cotizacionId);
    const accion = aceptar ? 'aceptar' : 'rechazar';
    const { ok, motivo, hacia } = MaquinaCotizacion.validar(accion, cot.estado);
    if (!ok) throw AppError.conflict(motivo);
    return cotizacionRepo.actualizar(cotizacionId, { estado: hacia });
  }

  // ============ ASESOR: Solicitar Garantia ============
  async solicitarGarantia(usuario, cotizacionId) {
    this.#exigirAsesor(usuario);
    const cot = await this.#cotizacion(cotizacionId);
    const { ok, motivo, hacia } = MaquinaCotizacion.validar('solicitar_garantia', cot.estado);
    if (!ok) throw AppError.conflict(motivo);
    return cotizacionRepo.actualizar(cotizacionId, { estado: hacia });
  }

  // ============ CLIENTE: Pagar Garantia ============
  async pagarGarantia(usuario, cotizacionId, { metodo } = {}) {
    const cot = await this.#cotizacionCliente(usuario, cotizacionId);
    const { ok, motivo, hacia } = MaquinaCotizacion.validar('pagar_garantia', cot.estado);
    if (!ok) throw AppError.conflict(motivo);

    const pago = await reservaRepo.crearPago({
      cotizacion_id: cot.id, monto: cot.garantiaMonto, concepto: 'GARANTIA',
      metodo: metodo || 'TARJETA', estado: 'PAGADO'
    });
    await comprobante.emitir({ pago_id: pago.id, monto_total: cot.garantiaMonto }); // <<include>>
    return cotizacionRepo.actualizar(cotizacionId, { estado: hacia });
  }

  // ============ ASESOR: Generar Orden de Reserva ============
  async generarOrdenReserva(usuario, cotizacionId) {
    this.#exigirAsesor(usuario);
    const cot = await this.#cotizacion(cotizacionId);
    const { ok, motivo } = MaquinaCotizacion.validar('generar_reserva', cot.estado);
    if (!ok) throw AppError.conflict(motivo);

    const reserva = await reservaRepo.crear({
      cliente_id: cot.clienteId,
      vehiculo_id: cot.vehiculoId,
      cotizacion_id: cot.id,
      fecha_inicio: cot.fechaInicio,
      fecha_fin: cot.fechaFin,
      estado: EstadoReserva.CONFIRMADA,
      monto_total_estimado: cot.montoTotalEstimado,
      garantia_monto: cot.garantiaMonto
    });
    await vehiculoRepo.actualizarEstado(cot.vehiculoId, 'ALQUILADO');
    await cotizacionRepo.actualizar(cotizacionId, { estado: EstadoCotizacion.CONVERTIDA });
    return reserva;
  }

  // ============ helpers ============
  #exigirAsesor(usuario) {
    if (usuario.rol !== Rol.ASESOR_VENTAS) {
      throw AppError.forbidden('Esta accion la realiza el Asesor de Ventas');
    }
  }

  #exigirCliente(usuario) {
    if (usuario.rol !== Rol.CLIENTE || !usuario.clienteId) {
      throw AppError.forbidden('Esta accion la realiza un Cliente');
    }
    return usuario.clienteId;
  }

  async #cotizacion(id) {
    const cot = await cotizacionRepo.buscarPorId(id);
    if (!cot) throw AppError.notFound('Cotizacion no encontrada');
    return cot;
  }

  async #cotizacionCliente(usuario, id) {
    const clienteId = this.#exigirCliente(usuario);
    const cot = await this.#cotizacion(id);
    if (cot.clienteId !== clienteId) {
      throw AppError.forbidden('No puedes operar una cotizacion de otro cliente');
    }
    return cot;
  }
}

module.exports = new CotizacionService();
