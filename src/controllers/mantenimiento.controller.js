const svc = require('../services/mantenimiento.service');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

/**
 * Controlador del proceso de Gestion de Ordenes de Mantenimiento.
 * Es fino: valida la entrada minima y delega la logica al servicio.
 */
class MantenimientoController {
  // ----- Consultas -----
  listarVehiculosPorMantener = asyncHandler(async (_req, res) => {
    res.json(await svc.vehiculosPorMantener());
  });

  listarCatalogo = asyncHandler(async (_req, res) => {
    res.json(await svc.catalogoRepuestos());
  });

  listarTiposMantenimiento = asyncHandler(async (_req, res) => {
    res.json(await svc.tiposMantenimiento());
  });

  comprarRepuesto = asyncHandler(async (req, res) => {
    res.json(await svc.comprarRepuesto(req.user, req.params.repuestoId, req.body.cantidad));
  });

  listarMecanicos = asyncHandler(async (_req, res) => {
    res.json(await svc.listarMecanicos());
  });

  listarOrdenes = asyncHandler(async (req, res) => {
    res.json(await svc.listarOrdenes(req.query.estado));
  });

  verOrden = asyncHandler(async (req, res) => {
    res.json(await svc.obtenerOrden(req.params.ordenId));
  });

  // <<include>> Generar Documentos de Costos
  documentosDeCostos = asyncHandler(async (req, res) => {
    res.json(await svc.documentosDeCostos(req.params.ordenId));
  });

  // ----- Jefe de Logistica -----
  crearOrden = asyncHandler(async (req, res) => {
    const { vehiculo_id, tipo_mantenimiento_id, mecanico_id } = req.body;
    if (!vehiculo_id || !tipo_mantenimiento_id || !mecanico_id) {
      throw AppError.badRequest('vehiculo_id, mecanico_id y tipo_mantenimiento_id son obligatorios');
    }
    res.status(201).json(await svc.crearOrden(req.user, req.body));
  });

  decidirConformidad = asyncHandler(async (req, res) => {
    const conforme = req.body.conforme !== false; // por defecto true
    res.json(await svc.decidirConformidad(req.user, req.params.ordenId, conforme, req.body.motivo));
  });

  // ----- Mecanico -----
  registrarInspeccion = asyncHandler(async (req, res) => {
    res.status(201).json(await svc.registrarInspeccion(req.user, req.params.ordenId, req.body));
  });

  // Inspeccion + requerimiento + mano de obra + presupuesto en un solo paso.
  procesarInspeccion = asyncHandler(async (req, res) => {
    res.status(201).json(await svc.procesarInspeccion(req.user, req.params.ordenId, req.body));
  });

  crearRequerimiento = asyncHandler(async (req, res) => {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      throw AppError.badRequest('Debe enviar "items": [{ repuesto_id | nombre, cantidad, ... }]');
    }
    res.status(201).json(await svc.crearRequerimiento(req.user, req.params.ordenId, items));
  });

  registrarManoObra = asyncHandler(async (req, res) => {
    res.status(201).json(await svc.registrarManoObra(req.user, req.params.ordenId, req.body));
  });

  generarPresupuesto = asyncHandler(async (req, res) => {
    res.status(201).json(await svc.generarPresupuesto(req.user, req.params.ordenId, req.body));
  });

  iniciarMantenimiento = asyncHandler(async (req, res) => {
    res.json(await svc.iniciarMantenimiento(req.user, req.params.ordenId));
  });

  finalizarMantenimiento = asyncHandler(async (req, res) => {
    res.json(await svc.finalizarMantenimiento(req.user, req.params.ordenId, req.body));
  });

  generarInforme = asyncHandler(async (req, res) => {
    res.status(201).json(await svc.generarInforme(req.user, req.params.ordenId, req.body));
  });
}

module.exports = new MantenimientoController();
