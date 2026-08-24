const supabase = require('../config/supabase');
const { unwrap } = require('../utils/db');
const Seguro = require('../models/Seguro');

/**
 * Acceso a datos de la tabla seguro (polizas por vehiculo).
 */
class SeguroRepository {
  async listar() {
    const data = unwrap(
      await supabase
        .from('seguro')
        .select('*, vehiculo:vehiculo_id (placa, marca, modelo)')
        .order('fecha_vencimiento', { ascending: true })
    );
    return data.map(Seguro.fromRow);
  }

  async buscarPorId(id) {
    const data = unwrap(
      await supabase.from('seguro').select('*').eq('id', id).maybeSingle()
    );
    return Seguro.fromRow(data);
  }

  async crear(datos) {
    const data = unwrap(await supabase.from('seguro').insert(datos).select().single());
    return Seguro.fromRow(data);
  }

  async actualizar(id, cambios) {
    const data = unwrap(
      await supabase.from('seguro').update(cambios).eq('id', id).select().single()
    );
    return Seguro.fromRow(data);
  }

  async eliminar(id) {
    unwrap(await supabase.from('seguro').delete().eq('id', id));
    return { eliminado: true };
  }

  /** Polizas vencidas o proximas a vencer (dentro de N dias). */
  async porVencer(dias = 30) {
    const limite = new Date();
    limite.setDate(limite.getDate() + dias);
    const data = unwrap(
      await supabase
        .from('seguro')
        .select('*, vehiculo:vehiculo_id (placa, marca, modelo)')
        .lte('fecha_vencimiento', limite.toISOString().slice(0, 10))
        .order('fecha_vencimiento', { ascending: true })
    );
    return data.map(Seguro.fromRow);
  }
}

module.exports = new SeguroRepository();
