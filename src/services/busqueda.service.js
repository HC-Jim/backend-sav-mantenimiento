const vehiculoRepo = require('../repositories/vehiculo.repository');
const clienteRepo = require('../repositories/cliente.repository');
const AppError = require('../utils/AppError');

/**
 * Casos de uso reutilizables (<<include>> del diagrama general):
 *   - Buscar Vehiculo
 *   - Buscar Cliente
 * Otros casos de uso los "incluyen" en lugar de repetir la busqueda.
 */
class BusquedaService {
  // <<include>> Buscar Vehiculo
  async buscarVehiculo(id) {
    const v = await vehiculoRepo.buscarPorId(id);
    if (!v) throw AppError.notFound('Vehiculo no encontrado');
    return v;
  }

  // <<include>> Buscar Cliente
  async buscarCliente(id) {
    const c = await clienteRepo.buscarPorId(id);
    if (!c) throw AppError.notFound('Cliente no encontrado');
    return c;
  }
}

module.exports = new BusquedaService();
