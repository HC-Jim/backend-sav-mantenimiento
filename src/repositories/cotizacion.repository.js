const supabase = require('../config/supabase');
const { unwrap } = require('../utils/db');
const Cotizacion = require('../models/Cotizacion');

/**
 * Acceso a datos de la tabla cotizacion.
 */
class CotizacionRepository {
  async crear(datos) {
    const data = unwrap(await supabase.from('cotizacion').insert(datos).select().single());
    return Cotizacion.fromRow(data);
  }

  async buscarPorId(id) {
    const data = unwrap(
      await supabase
        .from('cotizacion')
        .select('*, vehiculo:vehiculo_id (id, placa, marca, modelo), cliente:cliente_id (id, razon_social)')
        .eq('id', id)
        .maybeSingle()
    );
    return Cotizacion.fromRow(data);
  }

  async listarPorCliente(clienteId) {
    const data = unwrap(
      await supabase
        .from('cotizacion')
        .select('*, vehiculo:vehiculo_id (id, placa, marca, modelo)')
        .eq('cliente_id', clienteId)
        .order('creado_en', { ascending: false })
    );
    return data.map(Cotizacion.fromRow);
  }

  async listarTodas() {
    const data = unwrap(
      await supabase
        .from('cotizacion')
        .select('*, vehiculo:vehiculo_id (id, placa, marca, modelo), cliente:cliente_id (id, razon_social)')
        .order('creado_en', { ascending: false })
    );
    return data.map(Cotizacion.fromRow);
  }

  async actualizar(id, cambios) {
    const data = unwrap(
      await supabase.from('cotizacion').update(cambios).eq('id', id).select().single()
    );
    return Cotizacion.fromRow(data);
  }
}

module.exports = new CotizacionRepository();
