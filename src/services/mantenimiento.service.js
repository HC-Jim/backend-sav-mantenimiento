const ordenRepo = require('../repositories/orden.repository');
const vehiculoRepo = require('../repositories/vehiculo.repository');
const usuarioRepo = require('../repositories/usuario.repository');
const busqueda = require('./busqueda.service'); // «include» Buscar Vehiculo
const { Rol } = require('../domain/EstadoOrden');
const AppError = require('../utils/AppError');

/**
 * Proceso de mantenimiento — alcance vigente:
 * "Registrar Orden de Mantenimiento" (Jefe de Logística), que «incluye»
 * Buscar Vehículo y Buscar Mecánico.
 */
class MantenimientoService {
  // Catálogo de tipos de mantenimiento.
  async tiposMantenimiento() {
    return ordenRepo.listarTiposMantenimiento();
  }

  // «include» Buscar Mecánico
  async listarMecanicos() {
    return usuarioRepo.listarMecanicosDetalle();
  }

  // Buscar Orden de Mantenimiento (consulta de órdenes registradas).
  async listarOrdenes() {
    return ordenRepo.listar();
  }

  // Registrar Orden de Mantenimiento (Jefe de Logística).
  async crearOrden(usuario, datos) {
    if (usuario.rol !== Rol.JEFE_LOGISTICA) {
      throw AppError.forbidden('Solo el Jefe de Logistica puede crear ordenes');
    }
    const vehiculo = await busqueda.buscarVehiculo(datos.vehiculo_id); // «include» Buscar Vehiculo
    if (vehiculo.estado === 'EN_MANTENIMIENTO') {
      throw AppError.conflict('El vehiculo ya tiene una orden de mantenimiento en curso');
    }
    if (vehiculo.estado === 'ALQUILADO') {
      throw AppError.conflict('El vehiculo esta alquilado a un cliente; no se puede crear una orden de mantenimiento hasta su devolucion');
    }

    const tipo = await ordenRepo.buscarTipoMantenimiento(datos.tipo_mantenimiento_id);
    if (!tipo) throw AppError.badRequest('Debe seleccionar un tipo de mantenimiento valido');

    const orden = await ordenRepo.crear({
      vehiculo_id: datos.vehiculo_id,
      jefe_id: usuario.id,
      mecanico_id: datos.mecanico_id || null,
      tipo_mantenimiento_id: tipo.id,
      indicaciones: datos.indicaciones
    });
    await vehiculoRepo.actualizarEstado(datos.vehiculo_id, 'EN_MANTENIMIENTO');
    return orden;
  }
}

module.exports = new MantenimientoService();
