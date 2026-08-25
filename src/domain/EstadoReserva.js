/**
 * Maquina de estados de la Reserva de alquiler.
 *
 *  PENDIENTE_PAGO_GARANTIA --(pagar garantia [Cliente])--> CONFIRMADA
 *  CONFIRMADA --(pagar alquiler [Cliente/Cajero])--> EN_CURSO
 *  EN_CURSO   --(devolver garantia [Cajero])--> FINALIZADA
 *  CONFIRMADA/EN_CURSO --(cancelar / gestionar cancelacion)--> CANCELADA
 */
const EstadoReserva = Object.freeze({
  PENDIENTE_PAGO_GARANTIA: 'PENDIENTE_PAGO_GARANTIA',
  CONFIRMADA: 'CONFIRMADA',
  EN_CURSO: 'EN_CURSO',
  FINALIZADA: 'FINALIZADA',
  CANCELADA: 'CANCELADA'
});

const FINALES = [EstadoReserva.FINALIZADA, EstadoReserva.CANCELADA];

const ACCIONES = Object.freeze({
  pagar_garantia:        { desde: [EstadoReserva.PENDIENTE_PAGO_GARANTIA], hacia: EstadoReserva.CONFIRMADA },
  pagar_alquiler:        { desde: [EstadoReserva.CONFIRMADA], hacia: EstadoReserva.EN_CURSO },
  devolver_garantia:     { desde: [EstadoReserva.EN_CURSO], hacia: EstadoReserva.FINALIZADA },
  cancelar:              { desde: [EstadoReserva.CONFIRMADA], hacia: EstadoReserva.CANCELADA },
  gestionar_cancelacion: { desde: [EstadoReserva.CONFIRMADA, EstadoReserva.EN_CURSO], hacia: EstadoReserva.CANCELADA }
});

class MaquinaReserva {
  static esFinal(estado) {
    return FINALES.includes(estado);
  }

  /** Valida que una accion pueda ejecutarse desde el estado actual. */
  static validar(accion, estadoActual) {
    const def = ACCIONES[accion];
    if (!def) return { ok: false, motivo: `Accion desconocida: ${accion}` };
    if (!def.desde.includes(estadoActual)) {
      return {
        ok: false,
        motivo: `No se puede "${accion}" cuando la reserva esta en estado ${estadoActual}. ` +
          `Estados validos: ${def.desde.join(', ')}.`
      };
    }
    return { ok: true, hacia: def.hacia };
  }
}

module.exports = { EstadoReserva, MaquinaReserva };
