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
    this.precioAlquiler = Number(row.precio_normal || 0); // precio fijo del alquiler
    this.garantia = Number(row.garantia || 0);            // costo de garantía fijo
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
      precio_normal: this.precioAlquiler,
      garantia: this.garantia,
      kilometraje: this.kilometraje,
      fecha_ultimo_mantenimiento: this.fechaUltimoMantenimiento,
      fecha_proximo_mantenimiento: this.fechaProximoMantenimiento,
      estado: this.estado
    };
  }
}

module.exports = Vehiculo;
