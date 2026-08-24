const authService = require('../services/auth.service');
const AppError = require('../utils/AppError');

/**
 * Exige un token JWT valido en la cabecera Authorization: Bearer <token>.
 * Deja el usuario disponible en req.user = { id, rol, nombre }.
 */
function autenticar(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const [tipo, token] = header.split(' ');
    if (tipo !== 'Bearer' || !token) {
      throw AppError.unauthorized('Falta el token de autenticacion (Bearer)');
    }
    const payload = authService.verificarToken(token);
    req.user = { id: payload.sub, rol: payload.rol, nombre: payload.nombre };
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Restringe una ruta a uno o mas roles. Uso: exigirRol('JEFE_LOGISTICA').
 */
function exigirRol(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(AppError.unauthorized('No autenticado'));
    if (!roles.includes(req.user.rol)) {
      return next(AppError.forbidden(`Requiere rol: ${roles.join(' o ')}`));
    }
    next();
  };
}

module.exports = { autenticar, exigirRol };
