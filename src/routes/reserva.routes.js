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

// ---- Gestion interna (Jefe de Logistica) ----
router.get('/reservas/todas', exigirRol(Rol.JEFE_LOGISTICA), c.listarTodas);

// ---- Cliente ----
router.post('/reservas', exigirRol(Rol.CLIENTE), c.crearReserva);
router.get('/reservas/mias', exigirRol(Rol.CLIENTE), c.misReservas);
router.get('/reservas/:reservaId', c.verReserva);
router.patch('/reservas/:reservaId/pagar-garantia', exigirRol(Rol.CLIENTE), c.pagarGarantia);
router.patch('/reservas/:reservaId/pagar-alquiler', exigirRol(Rol.CLIENTE), c.pagarAlquiler);
router.patch('/reservas/:reservaId/cancelar', exigirRol(Rol.CLIENTE), c.cancelar);

module.exports = router;
