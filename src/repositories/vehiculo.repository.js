const supabase = require('../config/supabase');
const { unwrap } = require('../utils/db');
const Vehiculo = require('../models/Vehiculo');

/**
 * Acceso a datos de la tabla vehiculo.
 */
class VehiculoRepository {
  async buscarPorId(id) {
    const data = unwrap(
      await supabase.from('vehiculo').select('*').eq('id', id).maybeSingle()
    );
    return Vehiculo.fromRow(data);
  }

  /** Vehiculos cuyo proximo mantenimiento ya vencio (o vence hoy). */
  async porMantener(hastaFecha) {
    const data = unwrap(
      await supabase
        .from('vehiculo')
        .select('*')
        .lte('fecha_proximo_mantenimiento', hastaFecha)
        .order('fecha_proximo_mantenimiento', { ascending: true })
    );
    return data.map(Vehiculo.fromRow);
  }

  async actualizarEstado(id, estado, extra = {}) {
    const data = unwrap(
      await supabase.from('vehiculo').update({ estado, ...extra }).eq('id', id).select().single()
    );
    return Vehiculo.fromRow(data);
  }
}

module.exports = new VehiculoRepository();
