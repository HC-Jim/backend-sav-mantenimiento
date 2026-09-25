const supabase = require('../config/supabase');
const { unwrap } = require('../utils/db');

/**
 * Acceso a datos de la tabla cupon (descuentos por porcentaje o monto).
 */
class CuponRepository {
  async listar() {
    return unwrap(
      await supabase.from('cupon').select('*').order('id', { ascending: true })
    );
  }

  async buscarPorCodigo(codigo) {
    return unwrap(
      await supabase
        .from('cupon')
        .select('*')
        .ilike('codigo', codigo)
        .maybeSingle()
    );
  }

  async marcarUsado(id) {
    return unwrap(
      await supabase
        .from('cupon')
        .update({ usado: true, fecha_uso: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
    );
  }
}

module.exports = new CuponRepository();
