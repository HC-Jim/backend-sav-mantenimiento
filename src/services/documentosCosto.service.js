const ordenRepo = require('../repositories/orden.repository');
const AppError = require('../utils/AppError');

/**
 * Caso de uso reutilizable (<<include>>): Generar Documentos de Costos.
 * Lo incluyen Gestionar Orden de Mantenimiento y Autorizar/Rechazar Presupuesto:
 * consolida los presupuestos de una orden y su costo total.
 */
class DocumentosCostoService {
  // <<include>> Generar Documentos de Costos
  async generarParaOrden(ordenId) {
    const orden = await ordenRepo.buscarPorId(ordenId);
    if (!orden) throw AppError.notFound('Orden no encontrada');
    const presupuestos = orden.presupuestos || [];
    const total = presupuestos.reduce((acc, p) => acc + Number(p.total || 0), 0);
    return {
      orden_id: orden.id,
      vehiculo: orden.vehiculo,
      presupuestos,
      costo_total: total
    };
  }
}

module.exports = new DocumentosCostoService();
