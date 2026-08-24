const reservaRepo = require('../repositories/reserva.repository');

/**
 * Caso de uso reutilizable (<<include>>): Emitir Comprobante.
 * Lo incluyen Pagar Alquiler, Pagar Garantia y Devolver Garantia.
 */
class ComprobanteService {
  // <<include>> Emitir Comprobante
  async emitir({ pago_id, tipo = 'BOLETA', monto_total = 0 }) {
    return reservaRepo.crearComprobante({ pago_id, tipo, monto_total });
  }
}

module.exports = new ComprobanteService();
