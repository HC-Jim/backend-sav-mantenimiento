/**
 * Orden de Mantenimiento (registro). Alcance vigente: registrar y consultar.
 */
class OrdenMantenimiento {
  constructor(row) {
    // El detalle (mecánico, tipo, indicaciones) vive en detalle_orden_mantenimiento.
    // Se aplana en la respuesta para no cambiar el contrato con el frontend.
    const det = Array.isArray(row.detalle) ? (row.detalle[0] || null) : (row.detalle || null);

    this.id = row.id;
    this.vehiculoId = row.vehiculo_id;
    this.jefeId = row.jefe_id;
    this.estado = row.estado;
    this.fechaCreacion = row.fecha_creacion;

    // Datos del detalle (aplanados).
    this.mecanicoId = det?.mecanico_id ?? null;
    this.tipoMantenimientoId = det?.tipo_mantenimiento_id ?? null;
    this.indicaciones = det?.indicaciones ?? null;

    // Relaciones opcionales (cuando el repositorio las incluye en el select).
    this.vehiculo = row.vehiculo || null;
    this.tipoMantenimiento = det?.tipo_mantenimiento || null;
    this.mecanico = det?.mecanico || null;
  }

  static fromRow(row) {
    return row ? new OrdenMantenimiento(row) : null;
  }

  toJSON() {
    return {
      id: this.id,
      vehiculo_id: this.vehiculoId,
      jefe_id: this.jefeId,
      mecanico_id: this.mecanicoId,
      tipo_mantenimiento_id: this.tipoMantenimientoId,
      indicaciones: this.indicaciones,
      estado: this.estado,
      fecha_creacion: this.fechaCreacion,
      vehiculo: this.vehiculo,
      tipo_mantenimiento: this.tipoMantenimiento,
      mecanico: this.mecanico
    };
  }
}

module.exports = OrdenMantenimiento;
