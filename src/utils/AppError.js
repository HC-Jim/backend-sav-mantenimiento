/**
 * Error de aplicacion con codigo HTTP asociado. Permite que los servicios
 * lancen errores "de negocio" (400, 403, 404, 409) que el manejador central
 * traduce a la respuesta correcta.
 */
class AppError extends Error {
  constructor(mensaje, status = 400) {
    super(mensaje);
    this.name = 'AppError';
    this.status = status;
  }

  static badRequest(msg) { return new AppError(msg, 400); }
  static unauthorized(msg) { return new AppError(msg, 401); }
  static forbidden(msg) { return new AppError(msg, 403); }
  static notFound(msg) { return new AppError(msg, 404); }
  static conflict(msg) { return new AppError(msg, 409); }
}

module.exports = AppError;
