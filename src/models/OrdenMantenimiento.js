/**
 * Orden de Mantenimiento (registro). Alcance vigente: registrar y consultar.
 */
class OrdenMantenimiento {
  constructor(row) {
    this.id = row.id;
    this.vehiculoId = row.vehiculo_id;
    this.jefeId = row.jefe_id;
    this.mecanicoId = row.mecanico_id;
    this.tipoMantenimientoId = row.tipo_mantenimiento_id;
    this.indicaciones = row.indicaciones;
    this.estado = row.estado;
    this.fechaCreacion = row.fecha_creacion;

    // Relaciones opcionales (cuando el repositorio las incluye en el select).
    this.vehiculo = row.vehiculo || null;
    this.tipoMantenimiento = row.tipo_mantenimiento || null;
    this.mecanico = row.mecanico || null;
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
