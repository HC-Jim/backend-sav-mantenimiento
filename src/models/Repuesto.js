/**
 * Repuesto del catalogo de almacen (con control de stock).
 */
class Repuesto {
  constructor(row) {
    this.id = row.id;
    this.nombre = row.nombre;
    this.referencia = row.referencia;
    this.costoUnitario = Number(row.costo_unitario);
    this.stock = row.stock;
    this.creadoEn = row.creado_en;
  }

  static fromRow(row) {
    return row ? new Repuesto(row) : null;
  }

  hayStock(cantidad) {
    return this.stock >= cantidad;
  }

  toJSON() {
    return {
      id: this.id,
      nombre: this.nombre,
      referencia: this.referencia,
      costo_unitario: this.costoUnitario,
      stock: this.stock
    };
  }
}

module.exports = Repuesto;
