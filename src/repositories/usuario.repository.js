const supabase = require('../config/supabase');
const { unwrap } = require('../utils/db');
const Usuario = require('../models/Usuario');

/**
 * Acceso a datos de la tabla usuario.
 */
class UsuarioRepository {
  async buscarPorEmail(email) {
    const data = unwrap(
      await supabase.from('usuario').select('*').eq('email', email).maybeSingle()
    );
    return Usuario.fromRow(data);
  }

  async buscarPorId(id) {
    const data = unwrap(
      await supabase.from('usuario').select('*').eq('id', id).maybeSingle()
    );
    return Usuario.fromRow(data);
  }

  async listarPorRol(rol) {
    const data = unwrap(
      await supabase.from('usuario').select('*').eq('rol', rol).eq('estado', 'ACTIVO')
    );
    return data.map(Usuario.fromRow);
  }
}

module.exports = new UsuarioRepository();
