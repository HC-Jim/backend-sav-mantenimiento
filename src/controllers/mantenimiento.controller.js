const svc = require('../services/mantenimiento.service');

// Pequeno helper para no repetir try/catch en cada metodo.
const handler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (err) {
    next(err);
  }
};

// ===== JEFE DE LOGISTICA =====

// 1. Revisar las fechas de los mantenimientos
const listarVehiculosPorMantener = handler(async (req, res) => {
  res.json(await svc.vehiculosQueRequierenMantenimiento());
});

// 2. Crear la orden de mantenimiento
const crearOrden = handler(async (req, res) => {
  const { vehiculo_id, jefe_logistica, tipo_servicio } = req.body;
  if (!vehiculo_id || !jefe_logistica || !tipo_servicio) {
    return res.status(400).json({ error: 'vehiculo_id, jefe_logistica y tipo_servicio son obligatorios' });
  }
  res.status(201).json(await svc.crearOrden(req.body));
});

// Gestiona y compra (marca los repuestos como comprados)
const comprarRepuestos = handler(async (req, res) => {
  res.json(await svc.marcarRepuestosComprados(req.params.requerimientoId));
});

// Revisa y autoriza / rechaza presupuesto (gateway "Presupuesto autorizado?")
const decidirPresupuesto = handler(async (req, res) => {
  const { autorizado, motivo } = req.body;
  if (typeof autorizado !== 'boolean') {
    return res.status(400).json({ error: 'Debe enviar "autorizado": true|false' });
  }
  res.json(await svc.decidirPresupuesto(req.params.presupuestoId, autorizado, motivo));
});

// Revisar informe + dar conformidad y cerrar la orden
const cerrarOrden = handler(async (req, res) => {
  const conforme = req.body.conforme !== false; // por defecto true
  res.json(await svc.darConformidadYCerrar(req.params.ordenId, conforme));
});

// Entregar el vehiculo
const entregarVehiculo = handler(async (req, res) => {
  res.json(await svc.entregarVehiculo(req.params.ordenId));
});

// ===== MECANICO =====

// Recibe la orden / consulta detalle
const verOrden = handler(async (req, res) => {
  res.json(await svc.obtenerOrden(req.params.ordenId));
});

// Realiza la inspeccion (guarda diagnostico + si necesita repuestos)
const registrarInspeccion = handler(async (req, res) => {
  res.status(201).json(await svc.registrarInspeccion(req.params.ordenId, req.body));
});

// Genera requerimiento de repuestos
const crearRequerimiento = handler(async (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Debe enviar "items": [{ nombre, cantidad, ... }]' });
  }
  res.status(201).json(await svc.crearRequerimiento(req.params.ordenId, items));
});

// Genera el presupuesto
const generarPresupuesto = handler(async (req, res) => {
  res.status(201).json(await svc.generarPresupuesto(req.params.ordenId, req.body));
});

// Genera el informe tecnico (luego de mantenimiento + pruebas)
const generarInforme = handler(async (req, res) => {
  res.status(201).json(await svc.generarInforme(req.params.ordenId, req.body));
});

// ===== COMUNES =====
const listarOrdenes = handler(async (req, res) => {
  res.json(await svc.listarOrdenes(req.query.estado));
});

module.exports = {
  listarVehiculosPorMantener,
  crearOrden,
  comprarRepuestos,
  decidirPresupuesto,
  cerrarOrden,
  entregarVehiculo,
  verOrden,
  registrarInspeccion,
  crearRequerimiento,
  generarPresupuesto,
  generarInforme,
  listarOrdenes
};
