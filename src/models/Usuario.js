const bcrypt = require('bcryptjs');

/**
 * Actor del proceso: Jefe de Logistica o Mecanico.
 */
class Usuario {
  constructor({ id, nombre, email, password_hash, rol, cliente_id, estado, creado_en }) {
    this.id = id;
    this.nombre = nombre;
    this.email = email;
    this.passwordHash = password_hash;
    this.rol = rol;
    this.clienteId = cliente_id || null;
    this.estado = estado;
    this.creadoEn = creado_en;
  }

  static fromRow(row) {
    return row ? new Usuario(row) : null;
  }

  /** Genera el hash de una contrasena en texto plano. */
  static hashPassword(passwordPlano) {
    return bcrypt.hashSync(passwordPlano, 10);
  }

  /** Compara una contrasena en texto plano contra el hash almacenado. */
  verificarPassword(passwordPlano) {
    return bcrypt.compareSync(passwordPlano, this.passwordHash);
  }

  estaActivo() {
    return this.estado === 'ACTIVO';
  }

  /** Representacion segura (sin el hash de la contrasena). */
  toJSON() {
    return {
      id: this.id,
      nombre: this.nombre,
      email: this.email,
      rol: this.rol,
      cliente_id: this.clienteId,
      estado: this.estado
    };
  }
}

module.exports = Usuario;
