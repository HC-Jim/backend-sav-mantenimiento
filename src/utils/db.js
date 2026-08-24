/**
 * Desempaqueta la respuesta { data, error } de supabase-js.
 * Si hay error, lo lanza como Error para que lo capture el manejador central.
 */
function unwrap({ data, error }) {
  if (error) {
    const e = new Error(error.message);
    e.status = 500;
    throw e;
  }
  return data;
}

module.exports = { unwrap };
