const svc = require('../services/reserva.service');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Controlador del proceso de alquiler (Cliente).
 */
class ReservaController {
  // ----- Catalogo -----
  catalogo = asyncHandler(async (req, res) => {
    const soloDisponibles = req.query.todos !== 'true';
    res.json(await svc.catalogo(soloDisponibles));
  });

  detalleVehiculo = asyncHandler(async (req, res) => {
    res.json(await svc.detalleVehiculo(req.params.vehiculoId));
  });

  disponibilidad = asyncHandler(async (req, res) => {
    const { vehiculo_id, fecha_inicio, fecha_fin } = req.query;
    res.json(await svc.verificarDisponibilidad(vehiculo_id, fecha_inicio, fecha_fin));
  });

  // ----- Reservas (Cliente) -----
  generarOrdenReserva = asyncHandler(async (req, res) => {
    res.status(201).json(await svc.generarOrdenReserva(req.user, req.body));
  });

  misReservas = asyncHandler(async (req, res) => {
    res.json(await svc.misReservas(req.user));
  });

  verReserva = asyncHandler(async (req, res) => {
    res.json(await svc.obtenerReserva(req.user, req.params.reservaId));
  });

  // Registrar Pago de Orden de Reserva (emite el comprobante como parte del pago).
  pagarOrdenReserva = asyncHandler(async (req, res) => {
    res.json(await svc.pagarOrdenReserva(req.user, req.params.reservaId, req.body));
  });
}

module.exports = new ReservaController();
