const { MaquinaReserva } = require('../domain/EstadoReserva');

/**
 * Reserva de alquiler de un vehiculo por un cliente.
 */
class Reserva {
  constructor(row) {
    this.id = row.id;
    this.clienteId = row.cliente_id;
    this.vehiculoId = row.vehiculo_id;
    this.fechaSolicitud = row.fecha_solicitud;
    this.fechaInicio = row.fecha_inicio;
    this.fechaFin = row.fecha_fin;
    this.estado = row.estado;
    this.montoTotalEstimado = Number(row.monto_total_estimado || 0);
    this.garantiaMonto = Number(row.garantia_monto || 0);
    this.penalidad = Number(row.penalidad || 0);
    this.montoDevuelto = Number(row.monto_devuelto || 0);
    this.motivoCancelacion = row.motivo_cancelacion;
    this.fechaCancelacion = row.fecha_cancelacion;

    // Relaciones opcionales.
    this.vehiculo = row.vehiculo || null;
    this.cliente = row.cliente || null;
    this.pagos = row.pago || [];
  }

  static fromRow(row) {
    return row ? new Reserva(row) : null;
  }

  esFinal() {
    return MaquinaReserva.esFinal(this.estado);
  }

  toJSON() {
    return {
      id: this.id,
      cliente_id: this.clienteId,
      vehiculo_id: this.vehiculoId,
      fecha_solicitud: this.fechaSolicitud,
      fecha_inicio: this.fechaInicio,
      fecha_fin: this.fechaFin,
      estado: this.estado,
      monto_total_estimado: this.montoTotalEstimado,
      garantia_monto: this.garantiaMonto,
      penalidad: this.penalidad,
      monto_devuelto: this.montoDevuelto,
      motivo_cancelacion: this.motivoCancelacion,
      fecha_cancelacion: this.fechaCancelacion,
      vehiculo: this.vehiculo,
      cliente: this.cliente,
      pago: this.pagos
    };
  }
}

module.exports = Reserva;
