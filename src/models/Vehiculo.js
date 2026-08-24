/**
 * Vehiculo de la flota sujeto a mantenimiento.
 */
class Vehiculo {
  constructor(row) {
    this.id = row.id;
    this.placa = row.placa;
    this.marca = row.marca;
    this.modelo = row.modelo;
    this.anio = row.anio;
    this.color = row.color;
    this.kilometraje = row.kilometraje;
    this.tarifaDiaria = row.tarifa_diaria != null ? Number(row.tarifa_diaria) : null;
    this.fechaUltimoMantenimiento = row.fecha_ultimo_mantenimiento;
    this.fechaProximoMantenimiento = row.fecha_proximo_mantenimiento;
    this.estado = row.estado;
    this.creadoEn = row.creado_en;
  }

  static fromRow(row) {
    return row ? new Vehiculo(row) : null;
  }

  estaDisponible() {
    return this.estado === 'DISPONIBLE';
  }

  toJSON() {
    return {
      id: this.id,
      placa: this.placa,
      marca: this.marca,
      modelo: this.modelo,
      anio: this.anio,
      color: this.color,
      kilometraje: this.kilometraje,
      tarifa_diaria: this.tarifaDiaria,
      fecha_ultimo_mantenimiento: this.fechaUltimoMantenimiento,
      fecha_proximo_mantenimiento: this.fechaProximoMantenimiento,
      estado: this.estado
    };
  }
}

module.exports = Vehiculo;
