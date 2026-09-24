const { Router } = require('express');
const c = require('../controllers/reserva.controller');
const { autenticar, exigirRol } = require('../middlewares/auth.middleware');
const { Rol } = require('../domain/EstadoOrden');

const router = Router();

// Todas las rutas requieren autenticacion.
router.use(autenticar);

// ---- Catalogo (cualquier usuario autenticado) — «include» Buscar Vehiculo ----
router.get('/vehiculos', c.catalogo);                 // ?todos=true para incluir no disponibles
router.get('/vehiculos/:vehiculoId', c.detalleVehiculo);
router.get('/disponibilidad', c.disponibilidad);      // ?vehiculo_id=&fecha_inicio=&fecha_fin=

// ---- Cliente ----
router.post('/reservas', exigirRol(Rol.CLIENTE), c.generarOrdenReserva);            // Generar Orden de Reserva -> POR_PAGAR
router.get('/reservas/mias', exigirRol(Rol.CLIENTE), c.misReservas);                // «include» Buscar Orden de Reserva
router.get('/reservas/:reservaId', c.verReserva);
router.patch('/reservas/:reservaId/pagar', exigirRol(Rol.CLIENTE), c.pagarOrdenReserva); // Registrar Pago de Orden de Reserva -> RESERVADO («extend» Emitir Comprobante)

module.exports = router;
