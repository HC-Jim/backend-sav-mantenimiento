const { Router } = require('express');
const c = require('../controllers/gestion.controller');
const { autenticar, exigirRol } = require('../middlewares/auth.middleware');
const { Rol } = require('../domain/EstadoOrden');

const router = Router();

// Todo requiere autenticacion; el rol se valida por ruta.
router.use(autenticar);

// Administracion de flota/precios/seguros: Administrador (datos maestros).
const admin = exigirRol(Rol.ADMINISTRADOR);
// Clientes (Mantener Cliente / CRUD Cliente): Asesor de Ventas y Administrador.
const clientes = exigirRol(Rol.ASESOR_VENTAS, Rol.ADMINISTRADOR);

// ---- Vehiculos (Mantener Vehiculo + precio por vehiculo) ----
router.get('/vehiculos', admin, c.listarVehiculos);
router.post('/vehiculos', admin, c.crearVehiculo);
router.patch('/vehiculos/:id', admin, c.actualizarVehiculo);          // Gestion de Vehiculos (datos)
router.patch('/vehiculos/:id/precio', admin, c.actualizarPrecioVehiculo); // Catalogo de Precios (precio)
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

module.exports = router;
