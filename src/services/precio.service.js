const precioRepo = require('../repositories/catalogoPrecio.repository');
const AppError = require('../utils/AppError');

/**
 * Calcula el precio por dia aplicable a un vehiculo segun su categoria y la
 * cantidad de dias del alquiler (precio normal o de campania).
 */
class PrecioService {
  async tarifaPara(categoria, dias) {
    if (!categoria) {
      throw AppError.badRequest('El vehiculo no tiene categoria asignada; configurala en Gestion de Vehiculos');
    }
    const precio = await precioRepo.buscarPorCategoria(categoria);
    if (!precio) {
      throw AppError.badRequest(`La categoria "${categoria}" no tiene precio configurado en el Catalogo de Precios`);
    }
    const tarifa = precio.precioPara(dias);
    return {
      tarifa,
      aplicado: (precio.precioCampania > 0 && dias >= precio.diasMinCampania) ? 'CAMPANIA' : 'NORMAL',
      precio_regular: precio.precioRegular,
      precio_normal: precio.precioNormal,
      precio_campania: precio.precioCampania
    };
  }
}

module.exports = new PrecioService();
