require('dotenv').config();

/**
 * Configuracion centralizada leida de variables de entorno.
 * Falla temprano y con un mensaje claro si falta algo critico.
 */
const env = {
  port: process.env.PORT || 3000,
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h'
};

function validar() {
  const faltantes = [];
  if (!env.supabaseUrl) faltantes.push('SUPABASE_URL');
  if (!env.supabaseKey) faltantes.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!env.jwtSecret) faltantes.push('JWT_SECRET');
  if (faltantes.length) {
    throw new Error(
      `Faltan variables de entorno: ${faltantes.join(', ')}. ` +
      'Copia .env.example a .env y complétalas.'
    );
  }
}

module.exports = { env, validar };
