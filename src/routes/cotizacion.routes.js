const { Router } = require('express');
const c = require('../controllers/cotizacion.controller');
const { autenticar, exigirRol } = require('../middlewares/auth.middleware');
const { Rol } = require('../domain/EstadoOrden');

const router = Router();
router.use(autenticar);

// ---- Generar cotizacion: Asesor (a un cliente) o el propio Cliente ----
router.post('/cotizaciones', exigirRol(Rol.ASESOR_VENTAS, Rol.CLIENTE), c.generar);
router.get('/cotizaciones/todas', exigirRol(Rol.ASESOR_VENTAS, Rol.JEFE_LOGISTICA, Rol.CAJERO), c.listarTodas);
router.post('/cotizaciones/:id/solicitar-garantia', exigirRol(Rol.ASESOR_VENTAS), c.solicitarGarantia);
// Generar la orden de reserva: Asesor o el propio Cliente.
router.post('/cotizaciones/:id/generar-reserva', exigirRol(Rol.ASESOR_VENTAS, Rol.CLIENTE), c.generarReserva);

// ---- Cajero: aprobar garantia + emitir comprobante ----
router.get('/cotizaciones/garantias-pendientes', exigirRol(Rol.CAJERO), c.garantiasPendientes);
router.patch('/cotizaciones/:id/aprobar-garantia', exigirRol(Rol.CAJERO), c.aprobarGarantia);

// ---- Cliente ----
router.get('/cotizaciones/mias', exigirRol(Rol.CLIENTE), c.mias);
router.patch('/cotizaciones/:id/decidir', exigirRol(Rol.CLIENTE), c.decidir);
router.patch('/cotizaciones/:id/pagar-garantia', exigirRol(Rol.CLIENTE), c.pagarGarantia);

module.exports = router;
