const { Router } = require('express');
const c = require('../controllers/gestion.controller');
const { autenticar, exigirRol } = require('../middlewares/auth.middleware');
const { Rol } = require('../domain/EstadoOrden');

const router = Router();

// Todo requiere autenticacion; el rol se valida por ruta.
router.use(autenticar);

// Administracion de flota/precios/seguros: Jefe de Logistica y Administrador.
const admin = exigirRol(Rol.JEFE_LOGISTICA, Rol.ADMINISTRADOR);
// Clientes: ademas el Asesor de Ventas (Mantener Cliente / CRUD Cliente).
const clientes = exigirRol(Rol.JEFE_LOGISTICA, Rol.ADMINISTRADOR, Rol.ASESOR_VENTAS);

// ---- Vehiculos (Mantener Vehiculo) ----
router.get('/vehiculos', admin, c.listarVehiculos);
router.post('/vehiculos', admin, c.crearVehiculo);
router.patch('/vehiculos/:id', admin, c.actualizarVehiculo);
router.delete('/vehiculos/:id', admin, c.eliminarVehiculo);

// ---- Clientes (Mantener Cliente / CRUD Cliente) ----
router.get('/clientes', clientes, c.listarClientes);
router.post('/clientes', clientes, c.crearCliente);
router.patch('/clientes/:id', clientes, c.actualizarCliente);
router.delete('/clientes/:id', clientes, c.eliminarCliente);

// ---- Seguros / Polizas (CUS017 / CUS018) ----
router.get('/seguros', admin, c.listarSeguros);
router.get('/seguros/por-vencer', admin, c.segurosPorVencer);
router.post('/seguros', admin, c.crearSeguro);
router.post('/seguros/:id/renovar', admin, c.renovarSeguro);   // Registrar Renovacion de Seguro
router.patch('/seguros/:id', admin, c.actualizarSeguro);
router.delete('/seguros/:id', admin, c.eliminarSeguro);

// ---- Catalogo de Precios (Registrar Catalogo de Precios) ----
router.get('/precios', admin, c.listarPrecios);
router.post('/precios', admin, c.crearPrecio);
router.patch('/precios/:id', admin, c.actualizarPrecio);
router.delete('/precios/:id', admin, c.eliminarPrecio);

module.exports = router;
