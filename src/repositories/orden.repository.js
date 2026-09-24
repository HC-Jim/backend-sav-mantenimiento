const supabase = require('../config/supabase');
const { unwrap } = require('../utils/db');
const OrdenMantenimiento = require('../models/OrdenMantenimiento');

/**
 * Repositorio de Órdenes de Mantenimiento.
 * Alcance vigente: registrar la orden y consultar el catálogo de tipos.
 */
class OrdenRepository {
  async crear(datos) {
    const data = unwrap(
      await supabase
        .from('orden_mantenimiento')
        .insert({
          vehiculo_id: datos.vehiculo_id,
          jefe_id: datos.jefe_id,
          mecanico_id: datos.mecanico_id || null,
          tipo_mantenimiento_id: datos.tipo_mantenimiento_id,
          indicaciones: datos.indicaciones,
          estado: 'PENDIENTE_INSPECCION'
        })
        .select()
        .single()
    );
    return OrdenMantenimiento.fromRow(data);
  }

  // Buscar Orden de Mantenimiento: lista con vehículo, tipo y mecánico.
  async listar() {
    const data = unwrap(
      await supabase
        .from('orden_mantenimiento')
        .select('*, vehiculo:vehiculo_id (placa, marca, modelo), ' +
          'tipo_mantenimiento:tipo_mantenimiento_id (nombre), ' +
          'mecanico:usuario!orden_mantenimiento_mecanico_id_fkey (nombre)')
        .order('fecha_creacion', { ascending: false })
    );
    return data.map(OrdenMantenimiento.fromRow);
  }

  // ---------- Catálogo de tipos de mantenimiento ----------
  async listarTiposMantenimiento() {
    return unwrap(
      await supabase
        .from('tipo_mantenimiento')
        .select('*')
        .eq('activo', true)
        .order('id', { ascending: true })
    );
  }

  async buscarTipoMantenimiento(id) {
    return unwrap(
      await supabase.from('tipo_mantenimiento').select('*').eq('id', id).maybeSingle()
    );
  }
}

module.exports = new OrdenRepository();
