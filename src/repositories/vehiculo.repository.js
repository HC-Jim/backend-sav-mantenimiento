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

  /** Catalogo: todos los vehiculos (opcionalmente solo los disponibles). */
  async listar({ soloDisponibles = false } = {}) {
    let q = supabase.from('vehiculo').select('*').order('marca', { ascending: true });
    if (soloDisponibles) q = q.eq('estado', 'DISPONIBLE');
    const data = unwrap(await q);
    return data.map(Vehiculo.fromRow);
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

  // ---------- CRUD (Mantener Vehiculo) ----------
  async crear(datos) {
    const data = unwrap(await supabase.from('vehiculo').insert(datos).select().single());
    return Vehiculo.fromRow(data);
  }

  async actualizar(id, cambios) {
    const data = unwrap(
      await supabase.from('vehiculo').update(cambios).eq('id', id).select().single()
    );
    return Vehiculo.fromRow(data);
  }

  async eliminar(id) {
    unwrap(await supabase.from('vehiculo').delete().eq('id', id));
    return { eliminado: true };
  }
}

module.exports = new VehiculoRepository();
