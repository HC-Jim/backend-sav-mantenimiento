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

// ---- Gestion interna (Jefe, Cajero, Asesor de Ventas) ----
router.get('/reservas/todas', exigirRol(Rol.JEFE_LOGISTICA, Rol.CAJERO, Rol.ASESOR_VENTAS), c.listarTodas);

// ---- Cliente ----
// La reserva la genera el Asesor desde una cotizacion pagada (ver /api/ventas).
router.get('/reservas/mias', exigirRol(Rol.CLIENTE), c.misReservas);
router.get('/reservas/:reservaId', c.verReserva);
// Cliente opera sus reservas; Cajero atiende en ventanilla cualquier reserva.
router.patch('/reservas/:reservaId/pagar-alquiler', exigirRol(Rol.CLIENTE, Rol.CAJERO), c.pagarAlquiler);
router.patch('/reservas/:reservaId/cancelar', exigirRol(Rol.CLIENTE, Rol.CAJERO), c.cancelar);

// ---- Cajero (ventanilla) ----
router.patch('/reservas/:reservaId/devolver-garantia', exigirRol(Rol.CAJERO), c.devolverGarantia);      // <<include>> Pagar Garantia
router.patch('/reservas/:reservaId/gestionar-cancelacion', exigirRol(Rol.CAJERO), c.gestionarCancelacion); // <<include>> Cancelar Reserva
router.post('/reservas/:reservaId/emitir-comprobante', exigirRol(Rol.CAJERO), c.emitirComprobante);     // <<include>> Pagar Alquiler
router.get('/reservas/:reservaId/comprobantes', exigirRol(Rol.CAJERO), c.listarComprobantes);

module.exports = router;
