-- ============================================================
-- Quitar el trigger de creación de subtipos.
-- Las tablas jefe_logistica, cajero, administrador y mecanico SE MANTIENEN.
-- La fila de subtipo ahora la crea el backend (gestion.crearUsuario),
-- no la base de datos.
-- Ejecutar en el SQL Editor de Supabase.
-- ============================================================

drop trigger if exists trg_usuario_subtipo on usuario;
drop function if exists usuario_crear_subtipo();
