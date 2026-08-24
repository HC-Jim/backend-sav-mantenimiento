const { Router } = require('express');
const c = require('../controllers/gestion.controller');
const { autenticar, exigirRol } = require('../middlewares/auth.middleware');
const { Rol } = require('../domain/EstadoOrden');

const router = Router();

// Toda la administracion interna es del Jefe de Logistica.
router.use(autenticar, exigirRol(Rol.JEFE_LOGISTICA));

// ---- Vehiculos (Mantener Vehiculo) ----
router.get('/vehiculos', c.listarVehiculos);
router.post('/vehiculos', c.crearVehiculo);
router.patch('/vehiculos/:id', c.actualizarVehiculo);
router.delete('/vehiculos/:id', c.eliminarVehiculo);

// ---- Clientes (Mantener Cliente) ----
router.get('/clientes', c.listarClientes);
router.post('/clientes', c.crearCliente);
router.patch('/clientes/:id', c.actualizarCliente);
router.delete('/clientes/:id', c.eliminarCliente);

// ---- Seguros / Polizas (CUS017 / CUS018) ----
router.get('/seguros', c.listarSeguros);
router.get('/seguros/por-vencer', c.segurosPorVencer);   // ?dias=30
router.post('/seguros', c.crearSeguro);
router.patch('/seguros/:id', c.actualizarSeguro);
router.delete('/seguros/:id', c.eliminarSeguro);

module.exports = router;
