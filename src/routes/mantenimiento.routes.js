const { Router } = require('express');
const c = require('../controllers/mantenimiento.controller');

const router = Router();

// ---- Ordenes (consulta) ----
router.get('/ordenes', c.listarOrdenes);                       // ?estado=CREADA (opcional)
router.get('/ordenes/:ordenId', c.verOrden);                   // Mecanico "recibe la orden"

// ---- JEFE DE LOGISTICA ----
router.get('/vehiculos/por-mantener', c.listarVehiculosPorMantener); // 1. revisar fechas
router.post('/ordenes', c.crearOrden);                               // 2. crear OM
router.patch('/requerimientos/:requerimientoId/comprar', c.comprarRepuestos); // gestiona y compra
router.patch('/presupuestos/:presupuestoId/decidir', c.decidirPresupuesto);   // autoriza/rechaza
router.patch('/ordenes/:ordenId/cerrar', c.cerrarOrden);             // conformidad + cierre
router.patch('/ordenes/:ordenId/entregar', c.entregarVehiculo);      // entregar vehiculo

// ---- MECANICO ----
router.post('/ordenes/:ordenId/inspeccion', c.registrarInspeccion);  // realiza inspeccion
router.post('/ordenes/:ordenId/requerimientos', c.crearRequerimiento); // genera requerimiento
router.post('/ordenes/:ordenId/presupuesto', c.generarPresupuesto);  // genera presupuesto
router.post('/ordenes/:ordenId/informe', c.generarInforme);          // genera informe tecnico

module.exports = router;
