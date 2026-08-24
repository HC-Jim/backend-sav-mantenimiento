/**
 * Precio por categoria de vehiculo.
 *   precioRegular: precio de lista (referencia, debe ser > precioNormal)
 *   precioNormal:  precio de venta habitual por dia
 *   precioCampania: precio por dia cuando el alquiler dura >= diasMinCampania
 */
class CatalogoPrecio {
  constructor(row) {
    this.id = row.id;
    this.categoria = row.categoria;
    this.descripcion = row.descripcion;
    this.precioRegular = Number(row.precio_regular || 0);
    this.precioNormal = Number(row.precio_normal || 0);
    this.precioCampania = Number(row.precio_campania || 0);
    this.diasMinCampania = row.dias_min_campania ?? 7;
    this.vigente = row.vigente;
    this.creadoEn = row.creado_en;
  }

  static fromRow(row) {
    return row ? new CatalogoPrecio(row) : null;
  }

  /** Precio por dia aplicable segun la cantidad de dias del alquiler. */
  precioPara(dias) {
    if (this.precioCampania > 0 && dias >= this.diasMinCampania) return this.precioCampania;
    return this.precioNormal;
  }

  toJSON() {
    return {
      id: this.id,
      categoria: this.categoria,
      descripcion: this.descripcion,
      precio_regular: this.precioRegular,
      precio_normal: this.precioNormal,
      precio_campania: this.precioCampania,
      dias_min_campania: this.diasMinCampania,
      vigente: this.vigente
    };
  }
}

module.exports = CatalogoPrecio;
