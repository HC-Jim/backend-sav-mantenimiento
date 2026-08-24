const vehiculoRepo = require('../repositories/vehiculo.repository');
const clienteRepo = require('../repositories/cliente.repository');
const seguroRepo = require('../repositories/seguro.repository');
const AppError = require('../utils/AppError');

/**
 * Administracion interna (Jefe de Logistica):
 *  - Mantener Vehiculo (CRUD flota)
 *  - Mantener Cliente (CRUD)
 *  - Registrar Polizas / Seguros + alerta de vencimiento
 */
class GestionService {
  // ---------- VEHICULOS ----------
  listarVehiculos() {
    return vehiculoRepo.listar();
  }

  crearVehiculo(datos) {
    if (!datos.placa) throw AppError.badRequest('La placa es obligatoria');
    return vehiculoRepo.crear({
      placa: datos.placa,
      marca: datos.marca,
      modelo: datos.modelo,
      anio: datos.anio,
      color: datos.color,
      kilometraje: datos.kilometraje || 0,
      tarifa_diaria: datos.tarifa_diaria || 0,
      fecha_ultimo_mantenimiento: datos.fecha_ultimo_mantenimiento || null,
      fecha_proximo_mantenimiento: datos.fecha_proximo_mantenimiento || null,
      estado: datos.estado || 'DISPONIBLE'
    });
  }

  async actualizarVehiculo(id, cambios) {
    await this.#existe(vehiculoRepo, id, 'Vehiculo');
    return vehiculoRepo.actualizar(id, cambios);
  }

  async eliminarVehiculo(id) {
    await this.#existe(vehiculoRepo, id, 'Vehiculo');
    return vehiculoRepo.eliminar(id);
  }

  // ---------- CLIENTES ----------
  listarClientes() {
    return clienteRepo.listar();
  }

  crearCliente(datos) {
    if (!datos.numero_documento) throw AppError.badRequest('El numero de documento es obligatorio');
    return clienteRepo.crear({
      tipo_documento: datos.tipo_documento,
      numero_documento: datos.numero_documento,
      razon_social: datos.razon_social,
      licencia_conducir: datos.licencia_conducir,
      telefono: datos.telefono,
      correo: datos.correo
    });
  }

  async actualizarCliente(id, cambios) {
    await this.#existe(clienteRepo, id, 'Cliente');
    return clienteRepo.actualizar(id, cambios);
  }

  async eliminarCliente(id) {
    await this.#existe(clienteRepo, id, 'Cliente');
    return clienteRepo.eliminar(id);
  }

  // ---------- SEGUROS ----------
  listarSeguros() {
    return seguroRepo.listar();
  }

  segurosPorVencer(dias) {
    return seguroRepo.porVencer(dias ? Number(dias) : 30);
  }

  crearSeguro(datos) {
    if (!datos.vehiculo_id) throw AppError.badRequest('vehiculo_id es obligatorio');
    return seguroRepo.crear({
      vehiculo_id: datos.vehiculo_id,
      tipo_seguro: datos.tipo_seguro,
      num_poliza: datos.num_poliza,
      aseguradora_entidad: datos.aseguradora_entidad,
      fecha_emision: datos.fecha_emision || null,
      fecha_vencimiento: datos.fecha_vencimiento || null,
      archivo_adjunto: datos.archivo_adjunto || null
    });
  }

  async actualizarSeguro(id, cambios) {
    await this.#existe(seguroRepo, id, 'Seguro');
    return seguroRepo.actualizar(id, cambios);
  }

  async eliminarSeguro(id) {
    await this.#existe(seguroRepo, id, 'Seguro');
    return seguroRepo.eliminar(id);
  }

  // ---------- helper ----------
  async #existe(repo, id, nombre) {
    const found = await repo.buscarPorId(id);
    if (!found) throw AppError.notFound(`${nombre} no encontrado`);
    return found;
  }
}

module.exports = new GestionService();
