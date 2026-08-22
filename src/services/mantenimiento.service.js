const supabase = require('../config/supabase');

// Envuelve la respuesta de supabase y lanza error si lo hay.
function unwrap({ data, error }) {
  if (error) throw new Error(error.message);
  return data;
}

// ---------- VEHICULOS ----------
async function vehiculosQueRequierenMantenimiento() {
  // "Revisar las fechas de los mantenimientos": vehiculos con proximo mantenimiento vencido o proximo.
  const hoy = new Date().toISOString().slice(0, 10);
  return unwrap(
    await supabase
      .from('vehiculo')
      .select('*')
      .lte('fecha_proximo_mantenimiento', hoy)
      .order('fecha_proximo_mantenimiento', { ascending: true })
  );
}

async function actualizarEstadoVehiculo(vehiculoId, estado) {
  return unwrap(
    await supabase.from('vehiculo').update({ estado }).eq('id', vehiculoId).select().single()
  );
}

// ---------- ORDEN DE MANTENIMIENTO ----------
async function crearOrden(datos) {
  const orden = unwrap(
    await supabase
      .from('orden_mantenimiento')
      .insert({
        vehiculo_id: datos.vehiculo_id,
        jefe_logistica: datos.jefe_logistica,
        mecanico: datos.mecanico || null,
        tipo_servicio: datos.tipo_servicio,
        descripcion: datos.descripcion,
        estado: 'CREADA'
      })
      .select()
      .single()
  );
  await actualizarEstadoVehiculo(datos.vehiculo_id, 'EN_MANTENIMIENTO');
  return orden;
}

async function obtenerOrden(ordenId) {
  return unwrap(
    await supabase
      .from('orden_mantenimiento')
      .select(`*,
        vehiculo:vehiculo_id (*),
        inspeccion (*),
        requerimiento_repuesto ( *, repuesto_item (*) ),
        presupuesto (*),
        informe_tecnico (*)`)
      .eq('id', ordenId)
      .single()
  );
}

async function listarOrdenes(estado) {
  let q = supabase
    .from('orden_mantenimiento')
    .select('*, vehiculo:vehiculo_id (placa, marca, modelo)')
    .order('fecha_creacion', { ascending: false });
  if (estado) q = q.eq('estado', estado);
  return unwrap(await q);
}

async function cambiarEstadoOrden(ordenId, estado, extra = {}) {
  return unwrap(
    await supabase
      .from('orden_mantenimiento')
      .update({ estado, ...extra })
      .eq('id', ordenId)
      .select()
      .single()
  );
}

// ---------- INSPECCION ----------
async function registrarInspeccion(ordenId, datos) {
  const insp = unwrap(
    await supabase
      .from('inspeccion')
      .insert({
        orden_id: ordenId,
        diagnostico: datos.diagnostico,
        necesita_repuestos: !!datos.necesita_repuestos,
        hora_inicio: datos.hora_inicio || null,
        hora_fin: datos.hora_fin || null
      })
      .select()
      .single()
  );
  await cambiarEstadoOrden(ordenId, 'INSPECCIONADA');
  return insp;
}

// ---------- REQUERIMIENTO DE REPUESTOS ----------
async function crearRequerimiento(ordenId, items) {
  const req = unwrap(
    await supabase
      .from('requerimiento_repuesto')
      .insert({ orden_id: ordenId, estado: 'SOLICITADO' })
      .select()
      .single()
  );
  const filas = items.map((it) => ({
    requerimiento_id: req.id,
    nombre: it.nombre,
    referencia: it.referencia || null,
    cantidad: it.cantidad || 1,
    precio_unitario: it.precio_unitario || 0
  }));
  const detalle = unwrap(await supabase.from('repuesto_item').insert(filas).select());
  return { ...req, repuesto_item: detalle };
}

async function marcarRepuestosComprados(requerimientoId) {
  return unwrap(
    await supabase
      .from('requerimiento_repuesto')
      .update({ estado: 'COMPRADO' })
      .eq('id', requerimientoId)
      .select()
      .single()
  );
}

// ---------- PRESUPUESTO ----------
async function generarPresupuesto(ordenId, datos) {
  const pres = unwrap(
    await supabase
      .from('presupuesto')
      .insert({
        orden_id: ordenId,
        costo_repuestos: datos.costo_repuestos || 0,
        costo_mano_obra: datos.costo_mano_obra || 0,
        estado: 'PENDIENTE'
      })
      .select()
      .single()
  );
  await cambiarEstadoOrden(ordenId, 'PRESUPUESTO_GENERADO');
  return pres;
}

async function decidirPresupuesto(presupuestoId, autorizado, motivo) {
  const pres = unwrap(
    await supabase
      .from('presupuesto')
      .update({
        estado: autorizado ? 'AUTORIZADO' : 'RECHAZADO',
        motivo_rechazo: autorizado ? null : motivo || null
      })
      .eq('id', presupuestoId)
      .select()
      .single()
  );
  // Actualiza la OM segun la decision (gateway "Presupuesto autorizado?")
  await cambiarEstadoOrden(
    pres.orden_id,
    autorizado ? 'AUTORIZADA' : 'RECHAZADA',
    autorizado ? {} : { fecha_cierre: new Date().toISOString() }
  );
  return pres;
}

// ---------- INFORME TECNICO ----------
async function generarInforme(ordenId, datos) {
  const inf = unwrap(
    await supabase
      .from('informe_tecnico')
      .insert({
        orden_id: ordenId,
        trabajos_realizados: datos.trabajos_realizados,
        repuestos_instalados: datos.repuestos_instalados,
        resultados_pruebas: datos.resultados_pruebas,
        observaciones: datos.observaciones,
        tiempo_inicio: datos.tiempo_inicio || null,
        tiempo_fin: datos.tiempo_fin || null
      })
      .select()
      .single()
  );
  await cambiarEstadoOrden(ordenId, 'INFORME_GENERADO');
  return inf;
}

// ---------- CIERRE Y ENTREGA ----------
async function darConformidadYCerrar(ordenId, conforme) {
  await supabase
    .from('informe_tecnico')
    .update({ conforme })
    .eq('orden_id', ordenId);
  return cambiarEstadoOrden(ordenId, 'CERRADA', { fecha_cierre: new Date().toISOString() });
}

async function entregarVehiculo(ordenId) {
  const orden = await cambiarEstadoOrden(ordenId, 'ENTREGADA');
  const hoy = new Date().toISOString().slice(0, 10);
  await supabase
    .from('vehiculo')
    .update({ estado: 'DISPONIBLE', fecha_ultimo_mantenimiento: hoy })
    .eq('id', orden.vehiculo_id);
  return orden;
}

module.exports = {
  vehiculosQueRequierenMantenimiento,
  crearOrden,
  obtenerOrden,
  listarOrdenes,
  registrarInspeccion,
  crearRequerimiento,
  marcarRepuestosComprados,
  generarPresupuesto,
  decidirPresupuesto,
  generarInforme,
  darConformidadYCerrar,
  entregarVehiculo
};
