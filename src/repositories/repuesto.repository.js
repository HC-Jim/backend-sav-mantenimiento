const supabase = require('../config/supabase');
const { unwrap } = require('../utils/db');
const Repuesto = require('../models/Repuesto');

/**
 * Acceso a datos del catalogo de repuestos (tabla repuesto).
 */
class RepuestoRepository {
  async listar() {
    const data = unwrap(
      await supabase.from('repuesto').select('*').order('nombre', { ascending: true })
    );
    return data.map(Repuesto.fromRow);
  }

  async buscarPorId(id) {
    const data = unwrap(
      await supabase.from('repuesto').select('*').eq('id', id).maybeSingle()
    );
    return Repuesto.fromRow(data);
  }

  async crear({ nombre, referencia, costo_unitario, stock }) {
    const data = unwrap(
      await supabase
        .from('repuesto')
        .insert({ nombre, referencia, costo_unitario: costo_unitario || 0, stock: stock || 0 })
        .select()
        .single()
    );
    return Repuesto.fromRow(data);
  }

  /** Descuenta stock (delta negativo) o lo repone (delta positivo). */
  async ajustarStock(id, nuevoStock) {
    const data = unwrap(
      await supabase.from('repuesto').update({ stock: nuevoStock }).eq('id', id).select().single()
    );
    return Repuesto.fromRow(data);
  }
}

module.exports = new RepuestoRepository();
