const supabase = require('../config/supabase');
const { unwrap } = require('../utils/db');
const OrdenMantenimiento = require('../models/OrdenMantenimiento');

/**
 * Repositorio de Órdenes de Mantenimiento.
 * Alcance vigente: registrar la orden y consultar el catálogo de tipos.
 */
class OrdenRepository {
  // Registra la cabecera (con sus campos) y, además, el detalle de la orden.
  async crear(datos) {
    // 17. Registra la orden (cabecera) -> 18. retorna número de orden
    const cabecera = unwrap(
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
    // 19. Registra también el detalle de la orden (CE_DetalleOrdenMantenimiento)
    await supabase.from('detalle_orden_mantenimiento').insert({
      orden_id: cabecera.id,
      mecanico_id: datos.mecanico_id || null,
      tipo_mantenimiento_id: datos.tipo_mantenimiento_id,
      indicaciones: datos.indicaciones
    });
    return OrdenMantenimiento.fromRow(cabecera);
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
