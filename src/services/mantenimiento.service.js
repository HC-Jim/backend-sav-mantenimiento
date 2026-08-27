const ordenRepo = require('../repositories/orden.repository');
const vehiculoRepo = require('../repositories/vehiculo.repository');
const repuestoRepo = require('../repositories/repuesto.repository');
const usuarioRepo = require('../repositories/usuario.repository');
const busqueda = require('./busqueda.service');              // <<include>> Buscar Vehiculo
const documentosCosto = require('./documentosCosto.service'); // <<include>> Generar Documentos de Costos
const { EstadoOrden, Estado, Rol } = require('../domain/EstadoOrden');
const AppError = require('../utils/AppError');

/**
 * Orquesta el proceso de Gestion de Ordenes de Mantenimiento (CUS003).
 *
 * Todos los metodos que avanzan el flujo reciben el usuario que actua
 * (con su rol) y validan la transicion contra la maquina de estados
 * antes de tocar la base de datos.
 */
class MantenimientoService {
  // ============ CONSULTAS ============
  async vehiculosPorMantener() {
    const hoy = new Date().toISOString().slice(0, 10);
    return vehiculoRepo.porMantener(hoy);
  }

  async catalogoRepuestos() {
    return repuestoRepo.listar();
  }

  // Comprar mas stock de un repuesto del catalogo (Jefe de Logistica).
  async comprarRepuesto(usuario, repuestoId, cantidad) {
    if (usuario.rol !== Rol.JEFE_LOGISTICA) {
      throw AppError.forbidden('Solo el Jefe de Logistica puede comprar repuestos');
    }
    const n = Math.trunc(Number(cantidad) || 0);
    if (n <= 0) throw AppError.badRequest('La cantidad a comprar debe ser mayor a 0');
    const repuesto = await repuestoRepo.buscarPorId(repuestoId);
    if (!repuesto) throw AppError.notFound('Repuesto no encontrado');
    return repuestoRepo.ajustarStock(repuestoId, Number(repuesto.stock) + n);
  }

  async listarMecanicos() {
    return usuarioRepo.listarPorRol(Rol.MECANICO);
  }

  async obtenerOrden(ordenId) {
    const orden = await ordenRepo.buscarPorId(ordenId);
    if (!orden) throw AppError.notFound('Orden no encontrada');
    return orden;
  }

  async listarOrdenes(estado) {
    return ordenRepo.listar(estado);
  }

  // <<include>> Generar Documentos de Costos
  async documentosDeCostos(ordenId) {
    return documentosCosto.generarParaOrden(ordenId);
  }

  // ============ 1. CREAR ORDEN (Jefe) ============
  async crearOrden(usuario, datos) {
    if (usuario.rol !== Rol.JEFE_LOGISTICA) {
      throw AppError.forbidden('Solo el Jefe de Logistica puede crear ordenes');
    }
    const vehiculo = await busqueda.buscarVehiculo(datos.vehiculo_id); // <<include>> Buscar Vehiculo
    if (vehiculo.estado === 'EN_MANTENIMIENTO') {
      throw AppError.conflict('El vehiculo ya tiene una orden de mantenimiento en curso');
    }
    // No se puede mantener un vehiculo que un cliente tiene reservado/en uso.
    if (vehiculo.estado === 'ALQUILADO') {
      throw AppError.conflict('El vehiculo esta alquilado a un cliente; no se puede crear una orden de mantenimiento hasta su devolucion');
    }

    const orden = await ordenRepo.crear({
      vehiculo_id: datos.vehiculo_id,
      jefe_id: usuario.id,
      mecanico_id: datos.mecanico_id || null,
      tipo_servicio: datos.tipo_servicio,
      descripcion: datos.descripcion
    });
    await vehiculoRepo.actualizarEstado(datos.vehiculo_id, 'EN_MANTENIMIENTO');
    return orden;
  }

  // ============ 2. INSPECCION (Mecanico) ============
  async registrarInspeccion(usuario, ordenId, datos) {
    const orden = await this.#ordenValidada('registrar_inspeccion', ordenId, usuario);
    const inspeccion = await ordenRepo.crearInspeccion(ordenId, datos);
    const destino = EstadoOrden.resolverDestinoInspeccion(datos.resultado);
    await ordenRepo.actualizar(ordenId, { estado: destino });
    return { inspeccion, estado: destino };
  }

  // ============ 3. REQUERIMIENTO DE REPUESTOS (Mecanico) ============
  async crearRequerimiento(usuario, ordenId, items) {
    await this.#ordenValidada('crear_requerimiento', ordenId, usuario);
    const req = await ordenRepo.crearRequerimiento(ordenId);
    const filas = await Promise.all(items.map((it) => this.#normalizarItem(it)));
    const detalle = await ordenRepo.agregarItems(req.id, filas);
    return { ...req, repuesto_item: detalle };
  }

  // ============ 4. GESTIONA Y COMPRA (Jefe) -> descuenta stock ============
  async comprarRepuestos(usuario, requerimientoId) {
    const req = await ordenRepo.buscarRequerimiento(requerimientoId);
    if (!req) throw AppError.notFound('Requerimiento no encontrado');
    await this.#ordenValidada('comprar_repuestos', req.orden_id, usuario);
    if (req.estado === 'COMPRADO') {
      throw AppError.conflict('El requerimiento ya fue comprado');
    }
    await this.#descontarStock(req.repuesto_item || []);
    return ordenRepo.marcarRequerimientoComprado(requerimientoId);
  }

  // ============ 5. GENERAR PRESUPUESTO (Mecanico) ============
  async generarPresupuesto(usuario, ordenId, datos) {
    await this.#ordenValidada('generar_presupuesto', ordenId, usuario);

    const detalle = Array.isArray(datos.detalle) ? datos.detalle : [];
    const filasDetalle = await Promise.all(detalle.map((d) => this.#normalizarDetalle(d)));
    const costoRepuestos = filasDetalle.length
      ? filasDetalle.reduce((acc, f) => acc + f.cantidad * f.precio_unitario, 0)
      : Number(datos.costo_repuestos || 0);

    const presupuesto = await ordenRepo.crearPresupuesto(ordenId, {
      costo_repuestos: costoRepuestos,
      costo_mano_obra: Number(datos.costo_mano_obra || 0)
    });
    const detalleGuardado = await ordenRepo.agregarDetallePresupuesto(presupuesto.id, filasDetalle);
    await ordenRepo.actualizar(ordenId, { estado: Estado.PENDIENTE_AUTORIZACION_PRESUPUESTO });
    return { ...presupuesto.toJSON(), detalle_presupuesto: detalleGuardado };
  }

  // ============ 6. AUTORIZAR / RECHAZAR PRESUPUESTO (Jefe) ============
  async decidirPresupuesto(usuario, presupuestoId, autorizado, motivo) {
    const presupuesto = await ordenRepo.buscarPresupuesto(presupuestoId);
    if (!presupuesto) throw AppError.notFound('Presupuesto no encontrado');
    const orden = await this.#ordenValidada('decidir_presupuesto', presupuesto.ordenId, usuario);

    // <<include>> Generar Documentos de Costos: el Jefe evalua el costo
    // consolidado (repuestos + mano de obra + total) antes de decidir.
    const documentosCostos = await documentosCosto.generarParaOrden(orden.id);

    const presActualizado = await ordenRepo.actualizarPresupuesto(presupuestoId, {
      estado: autorizado ? 'AUTORIZADO' : 'RECHAZADO',
      motivo_rechazo: autorizado ? null : motivo || null
    });

    if (autorizado) {
      await ordenRepo.actualizar(orden.id, { estado: Estado.PRESUPUESTO_AUTORIZADO });
    } else {
      // Flujo alternativo: presupuesto rechazado -> orden cerrada por rechazo.
      await ordenRepo.actualizar(orden.id, {
        estado: Estado.CERRADA_POR_RECHAZO,
        fecha_cierre: new Date().toISOString()
      });
      await vehiculoRepo.actualizarEstado(orden.vehiculoId, 'DISPONIBLE');
    }
    // Devuelve la decision junto con los documentos de costos evaluados.
    return { presupuesto: presActualizado, documentos_costos: documentosCostos };
  }

  // ============ 7. INICIAR MANTENIMIENTO (Mecanico) ============
  async iniciarMantenimiento(usuario, ordenId) {
    await this.#ordenValidada('iniciar_mantenimiento', ordenId, usuario);
    return ordenRepo.actualizar(ordenId, {
      estado: Estado.EN_MANTENIMIENTO,
      hora_inicio_mant: new Date().toISOString()
    });
  }

  // ============ 8. FINALIZAR MANTENIMIENTO (Mecanico) ============
  async finalizarMantenimiento(usuario, ordenId) {
    await this.#ordenValidada('finalizar_mantenimiento', ordenId, usuario);
    return ordenRepo.actualizar(ordenId, { hora_fin_mant: new Date().toISOString() });
  }

  // ============ 9. GENERAR INFORME TECNICO (Mecanico) ============
  async generarInforme(usuario, ordenId, datos) {
    await this.#ordenValidada('generar_informe', ordenId, usuario);
    const informe = await ordenRepo.crearInforme(ordenId, datos);
    await ordenRepo.actualizar(ordenId, { estado: Estado.PENDIENTE_CONFORMIDAD });
    return informe;
  }

  // ============ 10. CONFORMIDAD Y CIERRE (Jefe) ============
  async decidirConformidad(usuario, ordenId, conforme, motivo) {
    const orden = await this.#ordenValidada('decidir_conformidad', ordenId, usuario);

    if (!conforme) {
      // Flujo alternativo: rechazo de conformidad -> vuelve al mecanico.
      await ordenRepo.actualizarUltimoInforme(ordenId, {
        conforme: false,
        motivo_correccion: motivo || null
      });
      return ordenRepo.actualizar(ordenId, { estado: Estado.CORRECCION_REQUERIDA });
    }

    await ordenRepo.actualizarUltimoInforme(ordenId, { conforme: true });
    const acta = await ordenRepo.crearActaEntrega(ordenId, {
      generado_por: usuario.id,
      contenido: this.#redactarActa(orden, usuario)
    });
    const ordenCerrada = await ordenRepo.actualizar(ordenId, {
      estado: Estado.CERRADO,
      fecha_cierre: new Date().toISOString()
    });
    const hoy = new Date().toISOString().slice(0, 10);
    await vehiculoRepo.actualizarEstado(orden.vehiculoId, 'DISPONIBLE', {
      fecha_ultimo_mantenimiento: hoy
    });
    return { orden: ordenCerrada, acta_entrega: acta };
  }

  // ============ Helpers privados ============

  /** Carga la orden y valida la transicion; devuelve la orden. */
  async #ordenValidada(accion, ordenId, usuario) {
    const orden = await ordenRepo.buscarPorId(ordenId);
    if (!orden) throw AppError.notFound('Orden no encontrada');
    const { ok, motivo } = EstadoOrden.validar(accion, orden.estado, usuario.rol);
    if (!ok) throw AppError.conflict(motivo);
    return orden;
  }

  /** Normaliza un item de requerimiento, tomando el precio del catalogo si aplica. */
  async #normalizarItem(it) {
    let precio = Number(it.precio_unitario || 0);
    let nombre = it.nombre;
    let referencia = it.referencia || null;
    if (it.repuesto_id) {
      const rep = await repuestoRepo.buscarPorId(it.repuesto_id);
      if (!rep) throw AppError.badRequest(`Repuesto ${it.repuesto_id} no existe en el catalogo`);
      precio = precio || rep.costoUnitario;
      nombre = nombre || rep.nombre;
      referencia = referencia || rep.referencia;
    }
    return {
      repuesto_id: it.repuesto_id || null,
      nombre,
      referencia,
      cantidad: it.cantidad || 1,
      precio_unitario: precio,
      no_catalogado: !it.repuesto_id
    };
  }

  /** Normaliza una linea de detalle de presupuesto. */
  async #normalizarDetalle(d) {
    let precio = Number(d.precio_unitario || 0);
    let descripcion = d.descripcion;
    if (d.repuesto_id) {
      const rep = await repuestoRepo.buscarPorId(d.repuesto_id);
      if (!rep) throw AppError.badRequest(`Repuesto ${d.repuesto_id} no existe en el catalogo`);
      precio = precio || rep.costoUnitario;
      descripcion = descripcion || rep.nombre;
    }
    return {
      repuesto_id: d.repuesto_id || null,
      descripcion: descripcion || 'Item',
      cantidad: d.cantidad || 1,
      precio_unitario: precio
    };
  }

  /** Descuenta del catalogo el stock de los items comprados. */
  async #descontarStock(items) {
    for (const item of items) {
      if (!item.repuesto_id) continue; // items no catalogados no afectan stock
      const rep = await repuestoRepo.buscarPorId(item.repuesto_id);
      if (!rep) continue;
      if (!rep.hayStock(item.cantidad)) {
        throw AppError.conflict(
          `Stock insuficiente de "${rep.nombre}" (disponible ${rep.stock}, requerido ${item.cantidad})`
        );
      }
    }
    // Segunda pasada: aplica el descuento una vez validado todo.
    for (const item of items) {
      if (!item.repuesto_id) continue;
      const rep = await repuestoRepo.buscarPorId(item.repuesto_id);
      await repuestoRepo.ajustarStock(rep.id, rep.stock - item.cantidad);
    }
  }

  #redactarActa(orden, jefe) {
    const fecha = new Date().toLocaleString('es-PE');
    const placa = orden.vehiculo?.placa || `vehiculo #${orden.vehiculoId}`;
    return (
      `ACTA DE ENTREGA - Orden de Mantenimiento #${orden.id}\n` +
      `Vehiculo: ${placa}\n` +
      `Tipo de servicio: ${orden.tipoServicio || '-'}\n` +
      `Conformidad otorgada por: ${jefe.nombre} (Jefe de Logistica)\n` +
      `Fecha de entrega: ${fecha}\n` +
      `El vehiculo se entrega conforme, habiendose completado el mantenimiento.`
    );
  }
}

module.exports = new MantenimientoService();
