const vehiculoRepo = require('../repositories/vehiculo.repository');
const clienteRepo = require('../repositories/cliente.repository');
const seguroRepo = require('../repositories/seguro.repository');
const usuarioRepo = require('../repositories/usuario.repository');
const cuponRepo = require('../repositories/cupon.repository');
const Usuario = require('../models/Usuario');
const { Rol } = require('../domain/EstadoOrden');
const AppError = require('../utils/AppError');

/**
 * Administracion interna (Jefe de Logistica):
 *  - Mantener Vehiculo (CRUD flota)
 *  - Mantener Cliente (CRUD)
 *  - Registrar Polizas / Seguros + alerta de vencimiento
 */
class GestionService {
  // ---------- VEHICULOS (CRUD unificado: datos + precios) ----------
  listarVehiculos() {
    return vehiculoRepo.listar();
  }

  /** Crear un vehiculo nuevo con sus datos y su precio/garantia iniciales.
   *  El SKU se genera automaticamente (no editable). */
  async crearVehiculo(datos) {
    if (!datos.placa) throw AppError.badRequest('La placa es obligatoria');
    const precio = Number(datos.precio_normal || 0);
    const garantia = Number(datos.garantia || 0);
    if (precio < 0 || garantia < 0) {
      throw AppError.badRequest('El precio y la garantia no pueden ser negativos');
    }
    const sku = await vehiculoRepo.siguienteSku();
    const vehiculo = await vehiculoRepo.crear({
      sku,
      placa: datos.placa,
      marca: datos.marca,
      modelo: datos.modelo,
      anio: datos.anio,
      color: datos.color,
      categoria: datos.categoria,
      precio_normal: precio,
      garantia,
      estado: 'DISPONIBLE'
    });
    await vehiculoRepo.registrarPrecio(vehiculo.id, precio, garantia);
    return vehiculo;
  }

  /** Editar datos del vehiculo (sin precios). El SKU no se modifica. */
  async actualizarVehiculo(id, datos) {
    await this.#existe(vehiculoRepo, id, 'Vehiculo');
    return vehiculoRepo.actualizar(id, {
      placa: datos.placa,
      marca: datos.marca,
      modelo: datos.modelo,
      anio: datos.anio,
      color: datos.color,
      categoria: datos.categoria
    });
  }

  /** Editar el precio de alquiler (fijo) y la garantia; deja traza en el historial. */
  async actualizarPrecioVehiculo(id, datos) {
    await this.#existe(vehiculoRepo, id, 'Vehiculo');
    const precio = Number(datos.precio_normal || 0);
    const garantia = Number(datos.garantia || 0);
    if (precio < 0 || garantia < 0) {
      throw AppError.badRequest('El precio y la garantia no pueden ser negativos');
    }
    const actualizado = await vehiculoRepo.actualizar(id, { precio_normal: precio, garantia });
    await vehiculoRepo.registrarPrecio(id, precio, garantia);
    return actualizado;
  }

  /** Historial de precios + estadisticas (ultimo, promedio, variacion). */
  async historialPrecios(id) {
    await this.#existe(vehiculoRepo, id, 'Vehiculo');
    const historial = await vehiculoRepo.historialPrecios(id);
    const precios = historial.map((h) => Number(h.precio_normal));
    const ultimo = precios.length ? precios[precios.length - 1] : 0;
    const primero = precios.length ? precios[0] : 0;
    const promedio = precios.length
      ? Math.round((precios.reduce((a, b) => a + b, 0) / precios.length) * 100) / 100
      : 0;
    const variacion = Math.round((ultimo - primero) * 100) / 100;
    const variacionPct = primero > 0 ? Math.round(((ultimo - primero) / primero) * 10000) / 100 : 0;
    return { historial, ultimo, promedio, variacion, variacion_pct: variacionPct, cambios: historial.length };
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

  // ---------- USUARIOS ----------
  listarUsuarios() {
    return usuarioRepo.listarTodos();
  }

  /**
   * Alta de usuario (Administrador). Crea el usuario y su fila de subtipo
   * segun el rol (herencia), todo en el backend (sin triggers de BD).
   */
  async crearUsuario(datos) {
    const { nombre, email, password, rol } = datos;
    if (!nombre || !email || !password || !rol) {
      throw AppError.badRequest('nombre, email, password y rol son obligatorios');
    }
    if (!Object.values(Rol).includes(rol)) {
      throw AppError.badRequest('Rol invalido');
    }
    const existente = await usuarioRepo.buscarPorEmail(email);
    if (existente) throw AppError.conflict('Ya existe un usuario con ese email');

    const usuario = await usuarioRepo.crear({
      nombre,
      email,
      password_hash: Usuario.hashPassword(password),
      rol
    });
    // Herencia: crea la fila del subtipo correspondiente (en el backend).
    await usuarioRepo.crearFilaSubtipo(usuario.id, rol);
    return usuario;
  }

  // ---------- SEGUROS ----------
  listarSeguros() {
    return seguroRepo.listar();
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
      suma_asegurada: datos.suma_asegurada != null ? Number(datos.suma_asegurada) : null,
      prima: datos.prima != null ? Number(datos.prima) : null,
      cobertura: datos.cobertura || null,
      observaciones: datos.observaciones || null,
      archivo_adjunto: datos.archivo_adjunto || null
    });
  }

  // ---------- CUPONES ----------
  listarCupones() {
    return cuponRepo.listar();
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
