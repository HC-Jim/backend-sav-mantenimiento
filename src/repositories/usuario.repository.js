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

  /**
   * Mecánicos activos con sus datos de asignación (jornada, especialidad,
   * disponibilidad) y su carga de trabajo (órdenes de mantenimiento en curso).
   * Sirve al caso de uso «Buscar Mecánico».
   */
  async listarMecanicosDetalle() {
    // usuario = identidad/credenciales; mecanico (1:1) = datos del rol.
    const mecanicos = unwrap(
      await supabase
        .from('usuario')
        .select('id, nombre, email, rol, mecanico ( jornada, especialidad, telefono, disponible )')
        .eq('rol', 'MECANICO')
        .eq('estado', 'ACTIVO')
        .order('nombre', { ascending: true })
    );
    // Carga de trabajo: órdenes asignadas que aún no están cerradas.
    const ordenes = unwrap(
      await supabase
        .from('orden_mantenimiento')
        .select('mecanico_id, estado')
        .not('mecanico_id', 'is', null)
    );
    const FINALES = ['CERRADO', 'CERRADA_POR_RECHAZO'];
    const carga = {};
    for (const o of ordenes) {
      if (!FINALES.includes(o.estado)) carga[o.mecanico_id] = (carga[o.mecanico_id] || 0) + 1;
    }
    return mecanicos.map((m) => {
      const info = Array.isArray(m.mecanico) ? (m.mecanico[0] || {}) : (m.mecanico || {});
      return {
        id: m.id,
        nombre: m.nombre,
        email: m.email,
        rol: m.rol,
        jornada: info.jornada || null,
        especialidad: info.especialidad || null,
        telefono: info.telefono || null,
        disponible: info.disponible ?? true,
        ordenes_activas: carga[m.id] || 0
      };
    });
  }
}

module.exports = new UsuarioRepository();
