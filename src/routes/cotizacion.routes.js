const { Router } = require('express');
const c = require('../controllers/cotizacion.controller');
const { autenticar, exigirRol } = require('../middlewares/auth.middleware');
const { Rol } = require('../domain/EstadoOrden');

const router = Router();
router.use(autenticar);

// ---- Asesor de Ventas ----
router.post('/cotizaciones', exigirRol(Rol.ASESOR_VENTAS), c.generar);
router.get('/cotizaciones/todas', exigirRol(Rol.ASESOR_VENTAS, Rol.JEFE_LOGISTICA), c.listarTodas);
router.post('/cotizaciones/:id/solicitar-garantia', exigirRol(Rol.ASESOR_VENTAS), c.solicitarGarantia);
router.post('/cotizaciones/:id/generar-reserva', exigirRol(Rol.ASESOR_VENTAS), c.generarReserva);

// ---- Cliente ----
router.get('/cotizaciones/mias', exigirRol(Rol.CLIENTE), c.mias);
router.patch('/cotizaciones/:id/decidir', exigirRol(Rol.CLIENTE), c.decidir);
router.patch('/cotizaciones/:id/pagar-garantia', exigirRol(Rol.CLIENTE), c.pagarGarantia);

module.exports = router;
