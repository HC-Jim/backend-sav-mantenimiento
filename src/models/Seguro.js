/**
 * Poliza de seguro (SOAT / Todo Riesgo) asociada a un vehiculo.
 */
class Seguro {
  constructor(row) {
    this.id = row.id;
    this.vehiculoId = row.vehiculo_id;
    this.tipoSeguro = row.tipo_seguro;
    this.numPoliza = row.num_poliza;
    this.aseguradoraEntidad = row.aseguradora_entidad;
    this.fechaEmision = row.fecha_emision;
    this.fechaVencimiento = row.fecha_vencimiento;
    this.archivoAdjunto = row.archivo_adjunto;
    this.creadoEn = row.creado_en;
    this.vehiculo = row.vehiculo || null;
  }

  static fromRow(row) {
    return row ? new Seguro(row) : null;
  }

  /** Dias que faltan para el vencimiento (negativo si ya vencio). */
  diasParaVencer() {
    if (!this.fechaVencimiento) return null;
    const ms = new Date(this.fechaVencimiento) - new Date();
    return Math.ceil(ms / (1000 * 60 * 60 * 24));
  }

  toJSON() {
    return {
      id: this.id,
      vehiculo_id: this.vehiculoId,
      tipo_seguro: this.tipoSeguro,
      num_poliza: this.numPoliza,
      aseguradora_entidad: this.aseguradoraEntidad,
      fecha_emision: this.fechaEmision,
      fecha_vencimiento: this.fechaVencimiento,
      archivo_adjunto: this.archivoAdjunto,
      dias_para_vencer: this.diasParaVencer(),
      vehiculo: this.vehiculo
    };
  }
}

module.exports = Seguro;
