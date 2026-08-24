/**
 * Entrada del catálogo de precios (tarifa por categoria de vehiculo).
 */
class CatalogoPrecio {
  constructor(row) {
    this.id = row.id;
    this.categoria = row.categoria;
    this.descripcion = row.descripcion;
    this.precioDia = Number(row.precio_dia);
    this.vigente = row.vigente;
    this.creadoEn = row.creado_en;
  }

  static fromRow(row) {
    return row ? new CatalogoPrecio(row) : null;
  }

  toJSON() {
    return {
      id: this.id,
      categoria: this.categoria,
      descripcion: this.descripcion,
      precio_dia: this.precioDia,
      vigente: this.vigente
    };
  }
}

module.exports = CatalogoPrecio;
