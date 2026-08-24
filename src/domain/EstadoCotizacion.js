/**
 * Maquina de estados de la Cotizacion (flujo de ventas).
 *
 *  PENDIENTE --(cliente acepta)--> ACEPTADA --(asesor solicita garantia)-->
 *  GARANTIA_SOLICITADA --(cliente paga)--> GARANTIA_PAGADA
 *  --(asesor genera orden de reserva)--> CONVERTIDA
 *  PENDIENTE --(cliente rechaza)--> RECHAZADA
 */
const EstadoCotizacion = Object.freeze({
  PENDIENTE: 'PENDIENTE',
  ACEPTADA: 'ACEPTADA',
  RECHAZADA: 'RECHAZADA',
  GARANTIA_SOLICITADA: 'GARANTIA_SOLICITADA',
  GARANTIA_PAGADA: 'GARANTIA_PAGADA',
  CONVERTIDA: 'CONVERTIDA'
});

const FINALES = [EstadoCotizacion.RECHAZADA, EstadoCotizacion.CONVERTIDA];

const ACCIONES = Object.freeze({
  aceptar:            { desde: [EstadoCotizacion.PENDIENTE], hacia: EstadoCotizacion.ACEPTADA },
  rechazar:           { desde: [EstadoCotizacion.PENDIENTE], hacia: EstadoCotizacion.RECHAZADA },
  solicitar_garantia: { desde: [EstadoCotizacion.ACEPTADA], hacia: EstadoCotizacion.GARANTIA_SOLICITADA },
  pagar_garantia:     { desde: [EstadoCotizacion.GARANTIA_SOLICITADA], hacia: EstadoCotizacion.GARANTIA_PAGADA },
  generar_reserva:    { desde: [EstadoCotizacion.GARANTIA_PAGADA], hacia: EstadoCotizacion.CONVERTIDA }
});

class MaquinaCotizacion {
  static esFinal(estado) {
    return FINALES.includes(estado);
  }

  static validar(accion, estadoActual) {
    const def = ACCIONES[accion];
    if (!def) return { ok: false, motivo: `Accion desconocida: ${accion}` };
    if (!def.desde.includes(estadoActual)) {
      return {
        ok: false,
        motivo: `No se puede "${accion}" cuando la cotizacion esta en estado ${estadoActual}. ` +
          `Estados validos: ${def.desde.join(', ')}.`
      };
    }
    return { ok: true, hacia: def.hacia };
  }
}

module.exports = { EstadoCotizacion, MaquinaCotizacion };
