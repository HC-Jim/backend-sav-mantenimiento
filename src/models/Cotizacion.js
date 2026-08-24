const { MaquinaCotizacion } = require('../domain/EstadoCotizacion');

/**
 * Cotizacion de alquiler generada por el Asesor de Ventas.
 */
class Cotizacion {
  constructor(row) {
    this.id = row.id;
    this.clienteId = row.cliente_id;
    this.vehiculoId = row.vehiculo_id;
    this.asesorId = row.asesor_id;
    this.fechaInicio = row.fecha_inicio;
    this.fechaFin = row.fecha_fin;
    this.dias = row.dias;
    this.tarifaDia = Number(row.tarifa_dia || 0);
    this.montoTotalEstimado = Number(row.monto_total_estimado || 0);
    this.garantiaMonto = Number(row.garantia_monto || 0);
    this.estado = row.estado;
    this.creadoEn = row.creado_en;
    this.vehiculo = row.vehiculo || null;
    this.cliente = row.cliente || null;
  }

  static fromRow(row) {
    return row ? new Cotizacion(row) : null;
  }

  esFinal() {
    return MaquinaCotizacion.esFinal(this.estado);
  }

  toJSON() {
    return {
      id: this.id,
      cliente_id: this.clienteId,
      vehiculo_id: this.vehiculoId,
      asesor_id: this.asesorId,
      fecha_inicio: this.fechaInicio,
      fecha_fin: this.fechaFin,
      dias: this.dias,
      tarifa_dia: this.tarifaDia,
      monto_total_estimado: this.montoTotalEstimado,
      garantia_monto: this.garantiaMonto,
      estado: this.estado,
      vehiculo: this.vehiculo,
      cliente: this.cliente
    };
  }
}

module.exports = Cotizacion;
