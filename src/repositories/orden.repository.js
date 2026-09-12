const supabase = require('../config/supabase');
const { unwrap } = require('../utils/db');
const OrdenMantenimiento = require('../models/OrdenMantenimiento');

/**
 * Acceso a datos de la Orden de Mantenimiento y sus documentos asociados
 * (inspeccion, requerimientos, presupuesto+detalle, informe, acta de entrega).
 */
class OrdenRepository {
  // ---------- ORDEN ----------
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

  async buscarPorId(id) {
    const data = unwrap(
      await supabase
        .from('orden_mantenimiento')
        .select(`*,
          vehiculo:vehiculo_id (*),
          tipo_mantenimiento:tipo_mantenimiento_id (*),
          inspeccion (*),
          requerimiento_repuesto ( *, repuesto_item (*) ),
          mano_obra (*),
          presupuesto ( * ),
          informe_tecnico (*),
          acta_entrega (*)`)
        .eq('id', id)
        .maybeSingle()
    );
    if (!data) return null;
    // acta_entrega llega como arreglo (relacion) -> normaliza a objeto o null.
    if (Array.isArray(data.acta_entrega)) data.acta_entrega = data.acta_entrega[0] || null;
    return OrdenMantenimiento.fromRow(data);
  }

  async listar(estado) {
    let q = supabase
      .from('orden_mantenimiento')
      .select('*, vehiculo:vehiculo_id (id, placa, marca, modelo), tipo_mantenimiento:tipo_mantenimiento_id (id, codigo, nombre)')
      .order('fecha_creacion', { ascending: false });
    if (estado) q = q.eq('estado', estado);
    const data = unwrap(await q);
    return data.map(OrdenMantenimiento.fromRow);
  }

  // ---------- TIPO DE MANTENIMIENTO (catalogo) ----------
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

  async actualizar(id, cambios) {
    const data = unwrap(
      await supabase.from('orden_mantenimiento').update(cambios).eq('id', id).select().single()
    );
    return OrdenMantenimiento.fromRow(data);
  }

  // ---------- INSPECCION ----------
  async crearInspeccion(ordenId, datos) {
    return unwrap(
      await supabase
        .from('inspeccion')
        .insert({
          orden_id: ordenId,
          diagnostico: datos.diagnostico,
          resultado: datos.resultado || 'CON_HALLAZGOS',
          justificacion: datos.justificacion || null,
          necesita_repuestos: !!datos.necesita_repuestos,
          kilometraje_lectura: datos.kilometraje_lectura || null,
          nivel_combustible: datos.nivel_combustible || null,
          observaciones: datos.observaciones || null,
          hora_inicio: datos.hora_inicio || null,
          hora_fin: datos.hora_fin || null
        })
        .select()
        .single()
    );
  }

  // ---------- REQUERIMIENTO DE REPUESTOS ----------
  async crearRequerimiento(ordenId) {
    return unwrap(
      await supabase
        .from('requerimiento_repuesto')
        .insert({ orden_id: ordenId })
        .select()
        .single()
    );
  }

  async agregarItems(requerimientoId, filas) {
    return unwrap(
      await supabase
        .from('repuesto_item')
        .insert(filas.map((f) => ({ ...f, requerimiento_id: requerimientoId })))
        .select()
    );
  }

  async buscarRequerimiento(id) {
    return unwrap(
      await supabase
        .from('requerimiento_repuesto')
        .select('*, repuesto_item (*)')
        .eq('id', id)
        .maybeSingle()
    );
  }

  // ---------- MANO DE OBRA ----------
  async crearManoObra(ordenId, { costo, observacion }) {
    return unwrap(
      await supabase
        .from('mano_obra')
        .insert({ orden_id: ordenId, costo: costo || 0, observacion: observacion || null })
        .select()
        .single()
    );
  }

  /** Mano de obra registrada de una orden (la ultima), si existe. */
  async manoObraDeOrden(ordenId) {
    return unwrap(
      await supabase
        .from('mano_obra')
        .select('*')
        .eq('orden_id', ordenId)
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle()
    );
  }

  /** Requerimiento de una orden (el ultimo, con sus items), si existe. */
  async requerimientoDeOrden(ordenId) {
    return unwrap(
      await supabase
        .from('requerimiento_repuesto')
        .select('*, repuesto_item (*)')
        .eq('orden_id', ordenId)
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle()
    );
  }

  // ---------- PRESUPUESTO ----------
  async crearPresupuesto(ordenId, { costo_repuestos, costo_mano_obra }) {
    return unwrap(
      await supabase
        .from('presupuesto')
        .insert({
          orden_id: ordenId,
          costo_repuestos: costo_repuestos || 0,
          costo_mano_obra: costo_mano_obra || 0
        })
        .select()
        .single()
    );
  }


  // ---------- INFORME TECNICO ----------
  async crearInforme(ordenId, datos) {
    return unwrap(
      await supabase
        .from('informe_tecnico')
        .insert({
          orden_id: ordenId,
          trabajos_realizados: datos.trabajos_realizados,
          repuestos_instalados: datos.repuestos_instalados,
          resultados_pruebas: datos.resultados_pruebas,
          observaciones: datos.observaciones
        })
        .select()
        .single()
    );
  }

  async actualizarUltimoInforme(ordenId, cambios) {
    // Marca conformidad / motivo de correccion sobre el informe mas reciente.
    const informe = unwrap(
      await supabase
        .from('informe_tecnico')
        .select('id')
        .eq('orden_id', ordenId)
        .order('creado_en', { ascending: false })
        .limit(1)
        .maybeSingle()
    );
    if (!informe) return null;
    return unwrap(
      await supabase.from('informe_tecnico').update(cambios).eq('id', informe.id).select().single()
    );
  }

  // ---------- ACTA DE ENTREGA ----------
  async crearActaEntrega(ordenId, { generado_por, contenido }) {
    return unwrap(
      await supabase
        .from('acta_entrega')
        .insert({ orden_id: ordenId, generado_por, contenido })
        .select()
        .single()
    );
  }
}

module.exports = new OrdenRepository();
