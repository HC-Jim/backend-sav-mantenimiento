/**
 * Maquina de estados de la Orden de Reserva.
 *
 *  POR_PAGAR --(pagar orden [Cliente])--> RESERVADO
 *  RESERVADO --(devolver garantia [Cajero])--> FINALIZADA
 *
 * El Cliente genera la orden (POR_PAGAR) y luego la paga (garantia + alquiler)
 * quedando RESERVADO. El Cajero cierra devolviendo la garantia (FINALIZADA).
 */
const EstadoReserva = Object.freeze({
  POR_PAGAR: 'POR_PAGAR',
  RESERVADO: 'RESERVADO',
  FINALIZADA: 'FINALIZADA'
});

const FINALES = [EstadoReserva.FINALIZADA];

const ACCIONES = Object.freeze({
  pagar_orden:       { desde: [EstadoReserva.POR_PAGAR], hacia: EstadoReserva.RESERVADO },
  devolver_garantia: { desde: [EstadoReserva.RESERVADO], hacia: EstadoReserva.FINALIZADA }
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
