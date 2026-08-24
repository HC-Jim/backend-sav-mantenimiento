const supabase = require('../config/supabase');
const { unwrap } = require('../utils/db');
const Cliente = require('../models/Cliente');

/**
 * Acceso a datos de la tabla cliente (CRUD).
 */
class ClienteRepository {
  async listar() {
    const data = unwrap(
      await supabase.from('cliente').select('*').order('razon_social', { ascending: true })
    );
    return data.map(Cliente.fromRow);
  }

  async buscarPorId(id) {
    const data = unwrap(
      await supabase.from('cliente').select('*').eq('id', id).maybeSingle()
    );
    return Cliente.fromRow(data);
  }

  async crear(datos) {
    const data = unwrap(await supabase.from('cliente').insert(datos).select().single());
    return Cliente.fromRow(data);
  }

  async actualizar(id, cambios) {
    const data = unwrap(
      await supabase.from('cliente').update(cambios).eq('id', id).select().single()
    );
    return Cliente.fromRow(data);
  }

  async eliminar(id) {
    unwrap(await supabase.from('cliente').delete().eq('id', id));
    return { eliminado: true };
  }
}

module.exports = new ClienteRepository();
