const { Router } = require('express');
const c = require('../controllers/mantenimiento.controller');
const { autenticar, exigirRol } = require('../middlewares/auth.middleware');
const { Rol } = require('../domain/EstadoOrden');

const router = Router();

// Todas las rutas requieren autenticacion.
router.use(autenticar);

// El proceso de mantenimiento se reduce a "Registrar Orden de Mantenimiento"
// (Jefe de Logistica), que «incluye» Buscar Vehiculo y Buscar Mecanico.
// Se eliminaron: inspeccion, presupuesto, ejecucion, informe, conformidad y repuestos.

// ---- Catalogos / busquedas de apoyo ----
router.get('/tipos-mantenimiento', c.listarTiposMantenimiento);            // catalogo de tipos
router.get('/mecanicos', exigirRol(Rol.JEFE_LOGISTICA), c.listarMecanicos); // «include» Buscar Mecanico

// ---- JEFE DE LOGISTICA ----
router.get('/ordenes', exigirRol(Rol.JEFE_LOGISTICA), c.listarOrdenes);     // Buscar Orden de Mantenimiento
router.post('/ordenes', exigirRol(Rol.JEFE_LOGISTICA), c.crearOrden);       // Registrar Orden de Mantenimiento

module.exports = router;
