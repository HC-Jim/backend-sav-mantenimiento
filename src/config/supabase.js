const { createClient } = require('@supabase/supabase-js');
const { env } = require('./env');

/**
 * Cliente unico de Supabase (patron singleton).
 * Usa la SERVICE ROLE KEY: vive solo en el backend, nunca en el frontend.
 */
const supabase = createClient(env.supabaseUrl, env.supabaseKey, {
  auth: { persistSession: false }
});

module.exports = supabase;
