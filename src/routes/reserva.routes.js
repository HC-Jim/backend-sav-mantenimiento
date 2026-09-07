const { Router } = require('express');
const c = require('../controllers/reserva.controller');
const { autenticar, exigirRol } = require('../middlewares/auth.middleware');
const { Rol } = require('../domain/EstadoOrden');

const router = Router();

// Todas las rutas requieren autenticacion.
router.use(autenticar);

// ---- Catalogo (cualquier usuario autenticado) ----
router.get('/vehiculos', c.catalogo);                 // ?todos=true para incluir no disponibles
router.get('/vehiculos/:vehiculoId', c.detalleVehiculo);
router.get('/disponibilidad', c.disponibilidad);      // ?vehiculo_id=&fecha_inicio=&fecha_fin=

// ---- Gestion interna (Jefe, Cajero) ----
router.get('/reservas/todas', exigirRol(Rol.JEFE_LOGISTICA, Rol.CAJERO), c.listarTodas);

// ---- Cliente ----
router.post('/reservas', exigirRol(Rol.CLIENTE), c.generarOrdenReserva);            // 1. Generar Orden de Reserva -> POR_PAGAR
router.get('/reservas/mias', exigirRol(Rol.CLIENTE), c.misReservas);
router.get('/reservas/:reservaId', c.verReserva);
router.patch('/reservas/:reservaId/pagar', exigirRol(Rol.CLIENTE), c.pagarOrdenReserva); // 2. Pagar Orden de Reserva -> RESERVADO

// ---- Cajero (ventanilla) ----
router.patch('/reservas/:reservaId/cobrar-extra', exigirRol(Rol.CAJERO), c.cobrarDiasExtra);            // dias extra x precio/dia + comprobante
router.patch('/reservas/:reservaId/devolver-garantia', exigirRol(Rol.CAJERO), c.devolverGarantia);      // RESERVADO -> FINALIZADA
router.post('/reservas/:reservaId/emitir-comprobante', exigirRol(Rol.CAJERO), c.emitirComprobante);
router.get('/reservas/:reservaId/comprobantes', exigirRol(Rol.CAJERO), c.listarComprobantes);

module.exports = router;
