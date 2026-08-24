/**
 * Cliente que realiza reservas y alquileres.
 */
class Cliente {
  constructor(row) {
    this.id = row.id;
    this.tipoDocumento = row.tipo_documento;
    this.numeroDocumento = row.numero_documento;
    this.razonSocial = row.razon_social;
    this.licenciaConducir = row.licencia_conducir;
    this.telefono = row.telefono;
    this.correo = row.correo;
    this.creadoEn = row.creado_en;
  }

  static fromRow(row) {
    return row ? new Cliente(row) : null;
  }

  toJSON() {
    return {
      id: this.id,
      tipo_documento: this.tipoDocumento,
      numero_documento: this.numeroDocumento,
      razon_social: this.razonSocial,
      licencia_conducir: this.licenciaConducir,
      telefono: this.telefono,
      correo: this.correo
    };
  }
}

module.exports = Cliente;
