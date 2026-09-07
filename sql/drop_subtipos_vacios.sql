-- ============================================================
-- Eliminar tablas de subtipo vacías y sin uso (jefe_logistica, cajero,
-- administrador). Solo se conserva 'mecanico' (lo usa Buscar Mecánico).
-- Ejecutar en el SQL Editor de Supabase.
-- ============================================================

-- 1) Eliminar las tablas de subtipo sin uso
drop table if exists jefe_logistica cascade;
drop table if exists cajero         cascade;
drop table if exists administrador  cascade;

-- 2) Ajustar el trigger: solo debe crear la fila hija de mecanico.
--    (Antes referenciaba tablas que ya no existen -> fallaria al crear usuarios.)
create or replace function usuario_crear_subtipo() returns trigger as $$
begin
  if new.rol = 'MECANICO' then
    insert into mecanico(usuario_id) values (new.id) on conflict do nothing;
  end if;
  return new;
end;
$$ language plpgsql;

-- El trigger trg_usuario_subtipo ya existe y usa esta funcion; no hay que recrearlo.
