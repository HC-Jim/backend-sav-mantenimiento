const cuponRepo = require('../repositories/cupon.repository');
const AppError = require('../utils/AppError');

/**
 * Cupones de descuento (Aplicar Cupón).
 * El descuento se calcula sobre el monto del alquiler (no sobre la garantía,
 * que es un depósito reembolsable).
 */
class CuponService {
  listar() {
    return cuponRepo.listar();
  }

  /**
   * Valida un cupón por su código para un monto dado (el alquiler) y devuelve
   * el descuento aplicable. No marca el cupón como usado (eso ocurre al pagar).
   */
  async validar(codigo, monto) {
    if (!codigo) throw AppError.badRequest('Ingresa un código de cupón');
    const base = Number(monto || 0);
    const cupon = await cuponRepo.buscarPorCodigo(String(codigo).trim());
    if (!cupon) throw AppError.notFound('Cupón no encontrado');
    if (!cupon.activo) throw AppError.conflict('El cupón no está activo');
    if (cupon.usado) throw AppError.conflict('El cupón ya fue utilizado');

    const descuento = this.#calcularDescuento(cupon, base);
    return {
      id: cupon.id,
      codigo: cupon.codigo,
      descripcion: cupon.descripcion,
      tipo: cupon.tipo,
      valor: Number(cupon.valor),
      descuento
    };
  }

  /** Descuento (redondeado a 2 decimales), acotado al propio monto. */
  #calcularDescuento(cupon, base) {
    const valor = Number(cupon.valor || 0);
    let d = cupon.tipo === 'PORCENTAJE' ? (base * valor) / 100 : valor;
    if (d > base) d = base;
    if (d < 0) d = 0;
    return Math.round(d * 100) / 100;
  }

  marcarUsado(id) {
    return cuponRepo.marcarUsado(id);
  }
}

module.exports = new CuponService();
