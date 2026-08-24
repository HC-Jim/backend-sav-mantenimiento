/**
 * Envuelve un controlador async para reenviar cualquier error al
 * manejador central, evitando repetir try/catch en cada metodo.
 */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
