const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const usuarioRepo = require('../repositories/usuario.repository');
const AppError = require('../utils/AppError');

/**
 * Logica de autenticacion: valida credenciales y emite tokens JWT.
 */
class AuthService {
  /**
   * Verifica email + contrasena y devuelve { token, usuario }.
   */
  async login(email, password) {
    if (!email || !password) {
      throw AppError.badRequest('email y password son obligatorios');
    }
    const usuario = await usuarioRepo.buscarPorEmail(email.trim().toLowerCase());
    if (!usuario || !usuario.verificarPassword(password)) {
      throw AppError.unauthorized('Credenciales invalidas');
    }
    if (!usuario.estaActivo()) {
      throw AppError.forbidden('El usuario esta inactivo');
    }
    const token = this.#firmarToken(usuario);
    return { token, usuario: usuario.toJSON() };
  }

  /** Devuelve el perfil del usuario a partir de su id (para /me). */
  async perfil(usuarioId) {
    const usuario = await usuarioRepo.buscarPorId(usuarioId);
    if (!usuario) throw AppError.notFound('Usuario no encontrado');
    return usuario.toJSON();
  }

  /** Verifica un token y devuelve su payload; lanza 401 si es invalido. */
  verificarToken(token) {
    try {
      return jwt.verify(token, env.jwtSecret);
    } catch {
      throw AppError.unauthorized('Token invalido o expirado');
    }
  }

  #firmarToken(usuario) {
    return jwt.sign(
      { sub: usuario.id, rol: usuario.rol, nombre: usuario.nombre },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn }
    );
  }
}

module.exports = new AuthService();
