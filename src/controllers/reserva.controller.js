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

  // ----- Reservas -----
  crearReserva = asyncHandler(async (req, res) => {
    res.status(201).json(await svc.crearReserva(req.user, req.body));
  });

  misReservas = asyncHandler(async (req, res) => {
    res.json(await svc.misReservas(req.user));
  });

  listarTodas = asyncHandler(async (_req, res) => {
    res.json(await svc.listarTodas());
  });

  verReserva = asyncHandler(async (req, res) => {
    res.json(await svc.obtenerReserva(req.user, req.params.reservaId));
  });

  pagarGarantia = asyncHandler(async (req, res) => {
    res.json(await svc.pagarGarantia(req.user, req.params.reservaId, req.body));
  });

  pagarAlquiler = asyncHandler(async (req, res) => {
    res.json(await svc.pagarAlquiler(req.user, req.params.reservaId, req.body));
  });

  cancelar = asyncHandler(async (req, res) => {
    res.json(await svc.cancelarReserva(req.user, req.params.reservaId, req.body));
  });

  // ----- Acciones del Cajero -----
  aprobarReserva = asyncHandler(async (req, res) => {
    res.json(await svc.aprobarReserva(req.user, req.params.reservaId));
  });

  cobrarDiasExtra = asyncHandler(async (req, res) => {
    res.json(await svc.cobrarDiasExtra(req.user, req.params.reservaId, req.body));
  });

  devolverGarantia = asyncHandler(async (req, res) => {
    res.json(await svc.devolverGarantia(req.user, req.params.reservaId, req.body));
  });

  gestionarCancelacion = asyncHandler(async (req, res) => {
    res.json(await svc.gestionarCancelacion(req.user, req.params.reservaId, req.body));
  });

  emitirComprobante = asyncHandler(async (req, res) => {
    res.status(201).json(await svc.emitirComprobante(req.user, req.params.reservaId));
  });

  listarComprobantes = asyncHandler(async (req, res) => {
    res.json(await svc.listarComprobantes(req.user, req.params.reservaId));
  });
}

module.exports = new ReservaController();
