const { Router } = require('express');
const c = require('../controllers/mantenimiento.controller');
const { autenticar, exigirRol } = require('../middlewares/auth.middleware');
const { Rol } = require('../domain/EstadoOrden');

const router = Router();

// Todas las rutas del proceso requieren autenticacion.
router.use(autenticar);

// ---- Consultas (ambos roles) ----
router.get('/ordenes', c.listarOrdenes);                 // ?estado=... (opcional)
router.get('/ordenes/:ordenId', c.verOrden);             // Mecanico "recibe la orden"
router.get('/ordenes/:ordenId/documentos-costos', c.documentosDeCostos); // <<include>> Generar Documentos de Costos
router.get('/vehiculos/por-mantener', c.listarVehiculosPorMantener);
router.get('/repuestos', c.listarCatalogo);              // catalogo de repuestos
router.patch('/repuestos/:repuestoId/comprar', exigirRol(Rol.JEFE_LOGISTICA), c.comprarRepuesto); // reponer stock (Jefe)
router.get('/mecanicos', exigirRol(Rol.JEFE_LOGISTICA), c.listarMecanicos); // para asignar OM

// ---- JEFE DE LOGISTICA ----
router.post('/ordenes', exigirRol(Rol.JEFE_LOGISTICA), c.crearOrden);
router.patch('/presupuestos/:presupuestoId/decidir', exigirRol(Rol.JEFE_LOGISTICA), c.decidirPresupuesto);
router.patch('/ordenes/:ordenId/conformidad', exigirRol(Rol.JEFE_LOGISTICA), c.decidirConformidad);

// ---- MECANICO ----
router.post('/ordenes/:ordenId/inspeccion', exigirRol(Rol.MECANICO), c.registrarInspeccion);
router.post('/ordenes/:ordenId/requerimientos', exigirRol(Rol.MECANICO), c.crearRequerimiento);
router.post('/ordenes/:ordenId/mano-obra', exigirRol(Rol.MECANICO), c.registrarManoObra);
router.post('/ordenes/:ordenId/presupuesto', exigirRol(Rol.MECANICO), c.generarPresupuesto);
router.patch('/ordenes/:ordenId/iniciar', exigirRol(Rol.MECANICO), c.iniciarMantenimiento);
router.patch('/ordenes/:ordenId/finalizar', exigirRol(Rol.MECANICO), c.finalizarMantenimiento);
router.post('/ordenes/:ordenId/informe', exigirRol(Rol.MECANICO), c.generarInforme);

module.exports = router;
