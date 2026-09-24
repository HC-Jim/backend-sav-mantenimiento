const svc = require('../services/mantenimiento.service');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

/**
 * Controlador del proceso de mantenimiento.
 * Alcance vigente: Registrar Orden de Mantenimiento (Jefe de Logística),
 * que «incluye» Buscar Vehículo y Buscar Mecánico.
 */
class MantenimientoController {
  // Catálogo de tipos de mantenimiento (apoyo del formulario).
  listarTiposMantenimiento = asyncHandler(async (_req, res) => {
    res.json(await svc.tiposMantenimiento());
  });

  // «include» Buscar Mecánico
  listarMecanicos = asyncHandler(async (_req, res) => {
    res.json(await svc.listarMecanicos());
  });

  // Registrar Orden de Mantenimiento
  crearOrden = asyncHandler(async (req, res) => {
    const { vehiculo_id, tipo_mantenimiento_id, mecanico_id } = req.body;
    if (!vehiculo_id || !tipo_mantenimiento_id || !mecanico_id) {
      throw AppError.badRequest('vehiculo_id, mecanico_id y tipo_mantenimiento_id son obligatorios');
    }
    res.status(201).json(await svc.crearOrden(req.user, req.body));
  });
}

module.exports = new MantenimientoController();
