const AppError = require('../utils/AppError');

/**
 * Calcula el precio por dia aplicable a un vehiculo segun sus propios precios
 * (normal o de campania) y la cantidad de dias del alquiler.
 */
class PrecioService {
  tarifaPara(vehiculo, dias) {
    if (!vehiculo) throw AppError.notFound('Vehiculo no encontrado');
    if (!vehiculo.precioNormal || vehiculo.precioNormal <= 0) {
      throw AppError.badRequest(
        `El vehiculo ${vehiculo.placa || ''} no tiene precio configurado; asignalo en Catalogo de Precios`
      );
    }
    const tarifa = vehiculo.precioPara(dias);
    return {
      tarifa,
      aplicado: (vehiculo.precioCampania > 0 && dias >= vehiculo.diasMinCampania) ? 'CAMPANIA' : 'NORMAL',
      precio_regular: vehiculo.precioRegular,
      precio_normal: vehiculo.precioNormal,
      precio_campania: vehiculo.precioCampania
    };
  }
}

module.exports = new PrecioService();
