/**
 * Vehiculo de la flota sujeto a mantenimiento.
 */
class Vehiculo {
  constructor(row) {
    this.id = row.id;
    this.sku = row.sku;
    this.placa = row.placa;
    this.marca = row.marca;
    this.modelo = row.modelo;
    this.anio = row.anio;
    this.color = row.color;
    this.categoria = row.categoria;
    this.precioRegular = Number(row.precio_regular || 0);
    this.precioNormal = Number(row.precio_normal || 0);
    this.precioCampania = Number(row.precio_campania || 0);
    this.diasMinCampania = row.dias_min_campania ?? 7;
    this.kilometraje = row.kilometraje;
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

  /** Precio por dia aplicable segun la cantidad de dias del alquiler. */
  precioPara(dias) {
    if (this.precioCampania > 0 && dias >= this.diasMinCampania) return this.precioCampania;
    return this.precioNormal;
  }

  toJSON() {
    return {
      id: this.id,
      sku: this.sku,
      placa: this.placa,
      marca: this.marca,
      modelo: this.modelo,
      anio: this.anio,
      color: this.color,
      categoria: this.categoria,
      precio_regular: this.precioRegular,
      precio_normal: this.precioNormal,
      precio_campania: this.precioCampania,
      dias_min_campania: this.diasMinCampania,
      kilometraje: this.kilometraje,
      fecha_ultimo_mantenimiento: this.fechaUltimoMantenimiento,
      fecha_proximo_mantenimiento: this.fechaProximoMantenimiento,
      estado: this.estado
    };
  }
}

module.exports = Vehiculo;
