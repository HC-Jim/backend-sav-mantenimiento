const { EstadoOrden } = require('../domain/EstadoOrden');

/**
 * Orden de Mantenimiento (OM): documento central del proceso.
 * Su atributo "estado" refleja el avance en el BPMN.
 */
class OrdenMantenimiento {
  constructor(row) {
    this.id = row.id;
    this.vehiculoId = row.vehiculo_id;
    this.jefeId = row.jefe_id;
    this.mecanicoId = row.mecanico_id;
    this.tipoServicio = row.tipo_servicio;
    this.descripcion = row.descripcion;
    this.estado = row.estado;
    this.horaInicioMant = row.hora_inicio_mant;
    this.horaFinMant = row.hora_fin_mant;
    this.fechaCreacion = row.fecha_creacion;
    this.fechaCierre = row.fecha_cierre;

    // Relaciones opcionales (cuando el repositorio las incluye en el select).
    this.vehiculo = row.vehiculo || null;
    this.inspecciones = row.inspeccion || [];
    this.requerimientos = row.requerimiento_repuesto || [];
    this.presupuestos = row.presupuesto || [];
    this.informes = row.informe_tecnico || [];
    this.actaEntrega = row.acta_entrega || null;
  }

  static fromRow(row) {
    return row ? new OrdenMantenimiento(row) : null;
  }

  estaEnEstado(...estados) {
    return estados.includes(this.estado);
  }

  estaCerrada() {
    return EstadoOrden.esFinal(this.estado);
  }

  /** Minutos de mano de obra registrados (si hay inicio y fin). */
  duracionMinutos() {
    if (!this.horaInicioMant || !this.horaFinMant) return null;
    const ms = new Date(this.horaFinMant) - new Date(this.horaInicioMant);
    return Math.round(ms / 60000);
  }

  toJSON() {
    return {
      id: this.id,
      vehiculo_id: this.vehiculoId,
      jefe_id: this.jefeId,
      mecanico_id: this.mecanicoId,
      tipo_servicio: this.tipoServicio,
      descripcion: this.descripcion,
      estado: this.estado,
      hora_inicio_mant: this.horaInicioMant,
      hora_fin_mant: this.horaFinMant,
      duracion_minutos: this.duracionMinutos(),
      fecha_creacion: this.fechaCreacion,
      fecha_cierre: this.fechaCierre,
      vehiculo: this.vehiculo,
      inspeccion: this.inspecciones,
      requerimiento_repuesto: this.requerimientos,
      presupuesto: this.presupuestos,
      informe_tecnico: this.informes,
      acta_entrega: this.actaEntrega
    };
  }
}

module.exports = OrdenMantenimiento;
