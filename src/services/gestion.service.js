const vehiculoRepo = require('../repositories/vehiculo.repository');
const clienteRepo = require('../repositories/cliente.repository');
const seguroRepo = require('../repositories/seguro.repository');
const precioRepo = require('../repositories/catalogoPrecio.repository');
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
      sku: datos.sku || null,
      placa: datos.placa,
      marca: datos.marca,
      modelo: datos.modelo,
      anio: datos.anio,
      color: datos.color,
      categoria: datos.categoria || null,
      kilometraje: datos.kilometraje || 0,
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

  /**
   * Registrar Renovación de Seguro (CUS - Torres): a partir de una poliza
   * existente, crea una nueva vigencia para el mismo vehiculo con nuevas
   * fechas/numero de poliza.
   */
  async renovarSeguro(id, datos) {
    const anterior = await this.#existe(seguroRepo, id, 'Seguro');
    if (!datos.fecha_emision || !datos.fecha_vencimiento) {
      throw AppError.badRequest('fecha_emision y fecha_vencimiento son obligatorias para renovar');
    }
    return seguroRepo.crear({
      vehiculo_id: anterior.vehiculoId,
      tipo_seguro: datos.tipo_seguro || anterior.tipoSeguro,
      num_poliza: datos.num_poliza || anterior.numPoliza,
      aseguradora_entidad: datos.aseguradora_entidad || anterior.aseguradoraEntidad,
      fecha_emision: datos.fecha_emision,
      fecha_vencimiento: datos.fecha_vencimiento,
      archivo_adjunto: datos.archivo_adjunto || null
    });
  }

  // ---------- CATALOGO DE PRECIOS ----------
  listarPrecios() {
    return precioRepo.listar();
  }

  crearPrecio(datos) {
    if (!datos.categoria) throw AppError.badRequest('La categoria es obligatoria');
    const p = this.#validarPrecios(datos);
    return precioRepo.crear({
      categoria: datos.categoria,
      descripcion: datos.descripcion,
      precio_regular: p.regular,
      precio_normal: p.normal,
      precio_campania: p.campania,
      dias_min_campania: p.diasMin,
      vigente: datos.vigente !== false
    });
  }

  async actualizarPrecio(id, cambios) {
    await this.#existe(precioRepo, id, 'Precio');
    // Si vienen precios, validarlos.
    if (cambios.precio_regular != null || cambios.precio_normal != null) {
      const p = this.#validarPrecios(cambios);
      cambios = {
        ...cambios,
        precio_regular: p.regular,
        precio_normal: p.normal,
        precio_campania: p.campania,
        dias_min_campania: p.diasMin
      };
    }
    return precioRepo.actualizar(id, cambios);
  }

  /** Valida y normaliza los precios: el regular debe ser mayor al normal. */
  #validarPrecios(datos) {
    const regular = Number(datos.precio_regular || 0);
    const normal = Number(datos.precio_normal || 0);
    const campania = Number(datos.precio_campania || 0);
    const diasMin = Number(datos.dias_min_campania || 7);
    if (regular <= normal) {
      throw AppError.badRequest('El precio regular debe ser mayor al precio normal');
    }
    return { regular, normal, campania, diasMin };
  }

  async eliminarPrecio(id) {
    await this.#existe(precioRepo, id, 'Precio');
    return precioRepo.eliminar(id);
  }

  // ---------- helper ----------
  async #existe(repo, id, nombre) {
    const found = await repo.buscarPorId(id);
    if (!found) throw AppError.notFound(`${nombre} no encontrado`);
    return found;
  }
}

module.exports = new GestionService();
