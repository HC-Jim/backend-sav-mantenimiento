const supabase = require('../config/supabase');
const { unwrap } = require('../utils/db');
const CatalogoPrecio = require('../models/CatalogoPrecio');

/**
 * Acceso a datos del catalogo de precios (tabla catalogo_precio).
 */
class CatalogoPrecioRepository {
  async listar() {
    const data = unwrap(
      await supabase.from('catalogo_precio').select('*').order('categoria', { ascending: true })
    );
    return data.map(CatalogoPrecio.fromRow);
  }

  async buscarPorId(id) {
    const data = unwrap(
      await supabase.from('catalogo_precio').select('*').eq('id', id).maybeSingle()
    );
    return CatalogoPrecio.fromRow(data);
  }

  async buscarPorCategoria(categoria) {
    const data = unwrap(
      await supabase.from('catalogo_precio').select('*').eq('categoria', categoria).maybeSingle()
    );
    return CatalogoPrecio.fromRow(data);
  }

  async crear(datos) {
    const data = unwrap(await supabase.from('catalogo_precio').insert(datos).select().single());
    return CatalogoPrecio.fromRow(data);
  }

  async actualizar(id, cambios) {
    const data = unwrap(
      await supabase.from('catalogo_precio').update(cambios).eq('id', id).select().single()
    );
    return CatalogoPrecio.fromRow(data);
  }

  async eliminar(id) {
    unwrap(await supabase.from('catalogo_precio').delete().eq('id', id));
    return { eliminado: true };
  }
}

module.exports = new CatalogoPrecioRepository();
