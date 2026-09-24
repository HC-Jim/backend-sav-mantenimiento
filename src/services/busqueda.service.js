const vehiculoRepo = require('../repositories/vehiculo.repository');
const AppError = require('../utils/AppError');

/**
 * Caso de uso reutilizable «include»: Buscar Vehículo.
 * Lo incluyen Generar Orden de Reserva, Registrar Pago, Registrar Seguro,
 * Registrar Precio de Alquiler y Registrar Orden de Mantenimiento.
 */
class BusquedaService {
  async buscarVehiculo(id) {
    const v = await vehiculoRepo.buscarPorId(id);
    if (!v) throw AppError.notFound('Vehiculo no encontrado');
    return v;
  }
}

module.exports = new BusquedaService();
