/**
 * Presupuesto de la orden (cabecera). Los repuestos viven en el
 * requerimiento (repuesto_item); el presupuesto solo guarda los totales.
 */
class Presupuesto {
  constructor(row) {
    this.id = row.id;
    this.ordenId = row.orden_id;
    this.costoRepuestos = Number(row.costo_repuestos);
    this.costoManoObra = Number(row.costo_mano_obra);
    this.total = Number(row.total);
    this.estado = row.estado;
    this.motivoRechazo = row.motivo_rechazo;
    this.creadoEn = row.creado_en;
  }

  static fromRow(row) {
    return row ? new Presupuesto(row) : null;
  }

  estaAutorizado() {
    return this.estado === 'AUTORIZADO';
  }

  toJSON() {
    return {
      id: this.id,
      orden_id: this.ordenId,
      costo_repuestos: this.costoRepuestos,
      costo_mano_obra: this.costoManoObra,
      total: this.total,
      estado: this.estado,
      motivo_rechazo: this.motivoRechazo
    };
  }
}

module.exports = Presupuesto;
