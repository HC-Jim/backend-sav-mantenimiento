const { Router } = require('express');
const c = require('../controllers/gestion.controller');
const { autenticar, exigirRol } = require('../middlewares/auth.middleware');
const { Rol } = require('../domain/EstadoOrden');

const router = Router();

// Todo requiere autenticacion; el rol se valida por ruta.
router.use(autenticar);

// Administracion de flota/precios/seguros/usuarios/clientes: Administrador.
const admin = exigirRol(Rol.ADMINISTRADOR);
const clientes = admin;

// ---- Vehiculos (CRUD unificado: datos + precios + historial) ----
router.get('/vehiculos', admin, c.listarVehiculos);
router.post('/vehiculos', admin, c.crearVehiculo);                        // Crear vehículo (SKU automático)
router.get('/vehiculos/:id/precios', admin, c.historialPrecios);          // Historial + último/promedio/variación
router.patch('/vehiculos/:id', admin, c.actualizarVehiculo);             // Editar datos del vehículo
router.patch('/vehiculos/:id/precio', admin, c.actualizarPrecioVehiculo); // Precio de alquiler + garantía

// ---- Cupones (tabla de descuentos) ----
router.get('/cupones', admin, c.listarCupones);

// ---- Clientes (Mantener Cliente / CRUD Cliente) ----
router.get('/clientes', clientes, c.listarClientes);
router.post('/clientes', clientes, c.crearCliente);
router.patch('/clientes/:id', clientes, c.actualizarCliente);
router.delete('/clientes/:id', clientes, c.eliminarCliente);

// ---- Usuarios (alta de usuario + fila de subtipo, sin triggers) ----
router.get('/usuarios', admin, c.listarUsuarios);
router.post('/usuarios', admin, c.crearUsuario);

// ---- Seguros / Polizas (Registrar Seguro) ----
// Se eliminó "Renovar Seguro" del alcance.
router.get('/seguros', admin, c.listarSeguros);
router.post('/seguros', admin, c.crearSeguro);
router.patch('/seguros/:id', admin, c.actualizarSeguro);
router.delete('/seguros/:id', admin, c.eliminarSeguro);

module.exports = router;
