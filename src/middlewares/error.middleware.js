/**
 * Manejador central de errores. Traduce AppError (y errores genericos) a
 * una respuesta JSON con el codigo HTTP correcto.
 */
function errorHandler(err, _req, res, _next) {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: err.message || 'Error interno del servidor' });
}

/** Ruta no encontrada (404). */
function notFound(_req, res) {
  res.status(404).json({ error: 'Ruta no encontrada' });
}

module.exports = { errorHandler, notFound };
