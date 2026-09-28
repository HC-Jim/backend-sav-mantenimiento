const supabase = require('../config/supabase');
const { unwrap } = require('../utils/db');
const OrdenMantenimiento = require('../models/OrdenMantenimiento');

/**
 * Repositorio de Órdenes de Mantenimiento.
 * Alcance vigente: registrar la orden y consultar el catálogo de tipos.
 */
class OrdenRepository {
  // Registra la cabecera (vehículo, jefe, estado) y su detalle
  // (mecánico, tipo, indicaciones) — patrón cabecera/detalle.
  async crear(datos) {
    // 17. Registra la orden (cabecera) -> 18. retorna número de orden
    const cabecera = unwrap(
      await supabase
        .from('orden_mantenimiento')
        .insert({
          vehiculo_id: datos.vehiculo_id,
          jefe_id: datos.jefe_id,
          estado: 'PENDIENTE_INSPECCION'
        })
        .select()
        .single()
    );
    // 19. Registra el detalle de la orden (CE_DetalleOrdenMantenimiento)
    const detalle = unwrap(
      await supabase
        .from('detalle_orden_mantenimiento')
        .insert({
          orden_id: cabecera.id,
          mecanico_id: datos.mecanico_id || null,
          tipo_mantenimiento_id: datos.tipo_mantenimiento_id,
          indicaciones: datos.indicaciones
        })
        .select()
        .single()
    );
    return OrdenMantenimiento.fromRow({ ...cabecera, detalle: [detalle] });
  }

  // Buscar Orden de Mantenimiento: cabecera + detalle (vehículo, tipo, mecánico).
  async listar() {
    const data = unwrap(
      await supabase
        .from('orden_mantenimiento')
        .select('*, vehiculo:vehiculo_id (placa, marca, modelo), ' +
          'detalle:detalle_orden_mantenimiento (indicaciones, ' +
          'tipo_mantenimiento:tipo_mantenimiento_id (nombre), ' +
          'mecanico:usuario!detalle_orden_mantenimiento_mecanico_id_fkey (nombre))')
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
