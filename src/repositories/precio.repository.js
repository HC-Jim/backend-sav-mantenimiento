const supabase = require('../config/supabase');
const { unwrap } = require('../utils/db');

/**
 * Precio Vehicular (cabecera/detalle):
 *   - precio_vehiculo         : cabecera (registro de precio de un vehículo).
 *   - detalle_precio_vehiculo : detalle  (conceptos ALQUILER y GARANTIA).
 */
class PrecioRepository {
  /** Registra un precio: cabecera + detalle (alquiler y garantía). */
  async registrar(vehiculoId, { alquiler, garantia, registradoPor = null }) {
    const cabecera = unwrap(
      await supabase
        .from('precio_vehiculo')
        .insert({ vehiculo_id: vehiculoId, registrado_por: registradoPor })
        .select()
        .single()
    );
    unwrap(
      await supabase.from('detalle_precio_vehiculo').insert([
        { precio_id: cabecera.id, concepto: 'ALQUILER', monto: alquiler },
        { precio_id: cabecera.id, concepto: 'GARANTIA', monto: garantia }
      ])
    );
    return { ...cabecera, alquiler, garantia };
  }

  /** Historial de registros de precio (cabecera + su detalle), ascendente. */
  async historial(vehiculoId) {
    const rows = unwrap(
      await supabase
        .from('precio_vehiculo')
        .select('id, fecha, ' +
          'detalle:detalle_precio_vehiculo (concepto, monto), ' +
          'registrado:usuario!precio_vehiculo_registrado_por_fkey (nombre)')
        .eq('vehiculo_id', vehiculoId)
        .order('fecha', { ascending: true })
    );
    // Aplana el detalle en {alquiler, garantia} por registro.
    return rows.map((r) => {
      const det = Array.isArray(r.detalle) ? r.detalle : [];
      const alquiler = Number(det.find((d) => d.concepto === 'ALQUILER')?.monto || 0);
      const garantia = Number(det.find((d) => d.concepto === 'GARANTIA')?.monto || 0);
      return {
        id: r.id,
        fecha: r.fecha,
        alquiler,
        garantia,
        registrado_por: r.registrado?.nombre || null
      };
    });
  }
}

module.exports = new PrecioRepository();
