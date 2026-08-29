const supabase = require('../config/supabase');
const { unwrap } = require('../utils/db');
const Reserva = require('../models/Reserva');

/**
 * Acceso a datos de reservas y sus pagos/comprobantes/alquiler.
 */
class ReservaRepository {
  async crear(datos) {
    const data = unwrap(
      await supabase.from('reserva').insert(datos).select().single()
    );
    return Reserva.fromRow(data);
  }

  async buscarPorId(id) {
    const data = unwrap(
      await supabase
        .from('reserva')
        .select(`*,
          vehiculo:vehiculo_id (*),
          cliente:cliente_id (*),
          pago (*)`)
        .eq('id', id)
        .maybeSingle()
    );
    return Reserva.fromRow(data);
  }

  async listarPorCliente(clienteId) {
    const data = unwrap(
      await supabase
        .from('reserva')
        .select('*, vehiculo:vehiculo_id (id, placa, marca, modelo)')
        .eq('cliente_id', clienteId)
        .order('fecha_solicitud', { ascending: false })
    );
    return data.map(Reserva.fromRow);
  }

  async listarTodas() {
    const data = unwrap(
      await supabase
        .from('reserva')
        .select('*, vehiculo:vehiculo_id (id, placa, marca, modelo), cliente:cliente_id (razon_social)')
        .order('fecha_solicitud', { ascending: false })
    );
    return data.map(Reserva.fromRow);
  }

  async actualizar(id, cambios) {
    const data = unwrap(
      await supabase.from('reserva').update(cambios).eq('id', id).select().single()
    );
    return Reserva.fromRow(data);
  }

  /**
   * Reservas que ocupan un vehiculo en un rango de fechas (para validar
   * disponibilidad). Solo cuentan las CONFIRMADA / EN_CURSO.
   */
  async reservasQueSolapan(vehiculoId, fechaInicio, fechaFin) {
    return unwrap(
      await supabase
        .from('reserva')
        .select('id, fecha_inicio, fecha_fin, estado')
        .eq('vehiculo_id', vehiculoId)
        .in('estado', ['CONFIRMADA', 'EN_CURSO'])
        .lte('fecha_inicio', fechaFin)
        .gte('fecha_fin', fechaInicio)
    );
  }

  // ---------- Alquiler / Pago / Comprobante ----------
  async crearAlquiler(datos) {
    return unwrap(await supabase.from('alquiler').insert(datos).select().single());
  }

  async crearPago(datos) {
    return unwrap(await supabase.from('pago').insert(datos).select().single());
  }

  async crearComprobante(datos) {
    return unwrap(await supabase.from('comprobante').insert(datos).select().single());
  }

  /** Pagos de una reserva (garantia, alquiler, devolucion). */
  async pagosDeReserva(reservaId) {
    return unwrap(
      await supabase.from('pago').select('*').eq('reserva_id', reservaId)
    );
  }

  /** Pagos asociados a una cotizacion (garantia). */
  async pagosDeCotizacion(cotizacionId) {
    return unwrap(
      await supabase.from('pago').select('*').eq('cotizacion_id', cotizacionId)
    );
  }

  /** Comprobantes de una reserva (via sus pagos). */
  async comprobantesDeReserva(reservaId) {
    const pagos = await this.pagosDeReserva(reservaId);
    const ids = pagos.map((p) => p.id);
    if (ids.length === 0) return [];
    return unwrap(
      await supabase.from('comprobante').select('*').in('pago_id', ids)
    );
  }
}

module.exports = new ReservaRepository();
