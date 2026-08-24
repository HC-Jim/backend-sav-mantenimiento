const svc = require('../services/gestion.service');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Controlador de administracion interna (Jefe de Logistica):
 * CRUD de vehiculos, clientes y seguros.
 */
class GestionController {
  // Vehiculos
  listarVehiculos = asyncHandler(async (_req, res) => res.json(await svc.listarVehiculos()));
  crearVehiculo = asyncHandler(async (req, res) => res.status(201).json(await svc.crearVehiculo(req.body)));
  actualizarVehiculo = asyncHandler(async (req, res) => res.json(await svc.actualizarVehiculo(req.params.id, req.body)));
  eliminarVehiculo = asyncHandler(async (req, res) => res.json(await svc.eliminarVehiculo(req.params.id)));

  // Clientes
  listarClientes = asyncHandler(async (_req, res) => res.json(await svc.listarClientes()));
  crearCliente = asyncHandler(async (req, res) => res.status(201).json(await svc.crearCliente(req.body)));
  actualizarCliente = asyncHandler(async (req, res) => res.json(await svc.actualizarCliente(req.params.id, req.body)));
  eliminarCliente = asyncHandler(async (req, res) => res.json(await svc.eliminarCliente(req.params.id)));

  // Seguros
  listarSeguros = asyncHandler(async (_req, res) => res.json(await svc.listarSeguros()));
  segurosPorVencer = asyncHandler(async (req, res) => res.json(await svc.segurosPorVencer(req.query.dias)));
  crearSeguro = asyncHandler(async (req, res) => res.status(201).json(await svc.crearSeguro(req.body)));
  actualizarSeguro = asyncHandler(async (req, res) => res.json(await svc.actualizarSeguro(req.params.id, req.body)));
  eliminarSeguro = asyncHandler(async (req, res) => res.json(await svc.eliminarSeguro(req.params.id)));
}

module.exports = new GestionController();
