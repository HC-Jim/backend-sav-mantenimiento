const svc = require('../services/cotizacion.service');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Controlador del flujo de ventas (cotizacion).
 */
class CotizacionController {
  // Asesor
  generar = asyncHandler(async (req, res) => res.status(201).json(await svc.generarCotizacion(req.user, req.body)));
  listarTodas = asyncHandler(async (_req, res) => res.json(await svc.listarTodas()));
  solicitarGarantia = asyncHandler(async (req, res) => res.json(await svc.solicitarGarantia(req.user, req.params.id)));
  generarReserva = asyncHandler(async (req, res) => res.status(201).json(await svc.generarOrdenReserva(req.user, req.params.id)));

  // Cliente
  mias = asyncHandler(async (req, res) => res.json(await svc.misCotizaciones(req.user)));
  decidir = asyncHandler(async (req, res) => {
    const aceptar = req.body.aceptar === true;
    res.json(await svc.decidir(req.user, req.params.id, aceptar));
  });
  pagarGarantia = asyncHandler(async (req, res) => res.json(await svc.pagarGarantia(req.user, req.params.id, req.body)));

  // Cajero
  garantiasPendientes = asyncHandler(async (_req, res) => res.json(await svc.listarGarantiasPendientes()));
  aprobarGarantia = asyncHandler(async (req, res) => res.json(await svc.aprobarGarantia(req.user, req.params.id)));
}

module.exports = new CotizacionController();
