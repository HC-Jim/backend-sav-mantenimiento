/**
 * Maquina de estados de la Orden de Mantenimiento.
 *
 * Centraliza el flujo del BPMN (CUS003): que transiciones son validas y
 * que rol puede ejecutarlas. Los servicios consultan esta clase antes de
 * cambiar el estado de una orden, de modo que el proceso no se pueda saltar
 * pasos ni ejecutar acciones fuera de orden.
 */

const Estado = Object.freeze({
  PENDIENTE_INSPECCION: 'PENDIENTE_INSPECCION',
  INSPECCION_COMPLETA: 'INSPECCION_COMPLETA',
  INSPECCION_POSTERGADA: 'INSPECCION_POSTERGADA',
  PENDIENTE_AUTORIZACION_PRESUPUESTO: 'PENDIENTE_AUTORIZACION_PRESUPUESTO',
  PRESUPUESTO_AUTORIZADO: 'PRESUPUESTO_AUTORIZADO',
  CERRADA_POR_RECHAZO: 'CERRADA_POR_RECHAZO',
  EN_MANTENIMIENTO: 'EN_MANTENIMIENTO',
  PENDIENTE_CONFORMIDAD: 'PENDIENTE_CONFORMIDAD',
  CORRECCION_REQUERIDA: 'CORRECCION_REQUERIDA',
  CERRADO: 'CERRADO'
});

const Rol = Object.freeze({
  JEFE_LOGISTICA: 'JEFE_LOGISTICA',
  MECANICO: 'MECANICO'
});

// Estados finales: no admiten mas transiciones.
const ESTADOS_FINALES = [Estado.CERRADO, Estado.CERRADA_POR_RECHAZO];

/**
 * Cada accion del proceso define: el/los estado(s) origen validos, el estado
 * destino y el rol autorizado. Es la traduccion directa del diagrama BPMN.
 */
const ACCIONES = Object.freeze({
  registrar_inspeccion: {
    desde: [Estado.PENDIENTE_INSPECCION, Estado.INSPECCION_POSTERGADA],
    // El destino real depende del resultado de la inspeccion (ver resolverDestinoInspeccion).
    hacia: Estado.INSPECCION_COMPLETA,
    rol: Rol.MECANICO
  },
  crear_requerimiento: {
    desde: [Estado.INSPECCION_COMPLETA],
    hacia: Estado.INSPECCION_COMPLETA, // no cambia el estado de la OM
    rol: Rol.MECANICO
  },
  comprar_repuestos: {
    desde: [Estado.INSPECCION_COMPLETA, Estado.PENDIENTE_AUTORIZACION_PRESUPUESTO],
    hacia: null, // no cambia el estado de la OM
    rol: Rol.JEFE_LOGISTICA
  },
  generar_presupuesto: {
    desde: [Estado.INSPECCION_COMPLETA],
    hacia: Estado.PENDIENTE_AUTORIZACION_PRESUPUESTO,
    rol: Rol.MECANICO
  },
  decidir_presupuesto: {
    desde: [Estado.PENDIENTE_AUTORIZACION_PRESUPUESTO],
    // Destino: PRESUPUESTO_AUTORIZADO o CERRADA_POR_RECHAZO segun la decision.
    hacia: Estado.PRESUPUESTO_AUTORIZADO,
    rol: Rol.JEFE_LOGISTICA
  },
  iniciar_mantenimiento: {
    // Se puede iniciar tras autorizar el presupuesto, o directo si la
    // inspeccion no tuvo hallazgos (flujo alternativo del informe).
    desde: [Estado.PRESUPUESTO_AUTORIZADO, Estado.INSPECCION_COMPLETA],
    hacia: Estado.EN_MANTENIMIENTO,
    rol: Rol.MECANICO
  },
  finalizar_mantenimiento: {
    desde: [Estado.EN_MANTENIMIENTO],
    hacia: Estado.EN_MANTENIMIENTO, // solo registra hora_fin
    rol: Rol.MECANICO
  },
  generar_informe: {
    desde: [Estado.EN_MANTENIMIENTO, Estado.CORRECCION_REQUERIDA],
    hacia: Estado.PENDIENTE_CONFORMIDAD,
    rol: Rol.MECANICO
  },
  decidir_conformidad: {
    desde: [Estado.PENDIENTE_CONFORMIDAD],
    // Destino: CERRADO (conforme) o CORRECCION_REQUERIDA (rechazo).
    hacia: Estado.CERRADO,
    rol: Rol.JEFE_LOGISTICA
  }
});

class EstadoOrden {
  /** Lista de estados finales. */
  static get FINALES() {
    return ESTADOS_FINALES;
  }

  static esFinal(estado) {
    return ESTADOS_FINALES.includes(estado);
  }

  static existeAccion(accion) {
    return Object.prototype.hasOwnProperty.call(ACCIONES, accion);
  }

  static definicion(accion) {
    return ACCIONES[accion];
  }

  /**
   * Verifica que una accion pueda ejecutarse desde el estado actual y por el
   * rol indicado. Devuelve { ok, motivo }.
   */
  static validar(accion, estadoActual, rol) {
    const def = ACCIONES[accion];
    if (!def) return { ok: false, motivo: `Accion desconocida: ${accion}` };
    if (def.rol !== rol) {
      return { ok: false, motivo: `Esta accion solo la realiza el rol ${def.rol}` };
    }
    if (!def.desde.includes(estadoActual)) {
      return {
        ok: false,
        motivo: `No se puede "${accion}" cuando la orden esta en estado ${estadoActual}. ` +
          `Estados validos: ${def.desde.join(', ')}.`
      };
    }
    return { ok: true };
  }

  /**
   * Resuelve el estado destino de la inspeccion segun su resultado:
   * - POSTERGADA        -> INSPECCION_POSTERGADA
   * - resto (con/sin)   -> INSPECCION_COMPLETA
   */
  static resolverDestinoInspeccion(resultado) {
    return resultado === 'POSTERGADA'
      ? Estado.INSPECCION_POSTERGADA
      : Estado.INSPECCION_COMPLETA;
  }
}

module.exports = { EstadoOrden, Estado, Rol };
