/**
 * Politicas de negocio del modulo de alquiler (valores centralizados).
 * Ajusta aqui las reglas sin tocar la logica.
 */
const PoliticasAlquiler = Object.freeze({
  // La garantia (deposito) se calcula como la tarifa diaria x este factor.
  FACTOR_GARANTIA: 5,

  // Cancelacion: si faltan MENOS de estas horas para el inicio, hay penalidad.
  HORAS_LIMITE_CANCELACION: 48,

  // Penalidad = este porcentaje de la garantia cuando se cancela tarde.
  PORCENTAJE_PENALIDAD: 0.30,

  /** Dias (>=1) entre dos fechas ISO (yyyy-mm-dd). */
  diasEntre(fechaInicio, fechaFin) {
    const ini = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    const dias = Math.ceil((fin - ini) / (1000 * 60 * 60 * 24));
    return Math.max(dias, 1);
  }
});

module.exports = PoliticasAlquiler;
