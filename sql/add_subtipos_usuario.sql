-- ============================================================
-- Herencia por tabla (Class-Table Inheritance) de usuario.
-- usuario = superclase (identidad + credenciales + rol).
-- Cada rol = tabla hija con usuario_id (PK/FK) → "es-un usuario".
-- Ejecutar en el SQL Editor de Supabase. (mecanico ya existe.)
-- ============================================================

-- 1) Subtipos de empleados (mínimos; agrega aquí sus campos futuros)
create table if not exists jefe_logistica (
  usuario_id bigint primary key references usuario(id) on delete cascade,
  -- ej. a futuro: almacen_a_cargo varchar, ...
  creado_en  timestamptz not null default now()
);

create table if not exists asesor (
  usuario_id bigint primary key references usuario(id) on delete cascade,
  -- ej. a futuro: meta_ventas numeric, comision_pct numeric, zona varchar, ...
  creado_en  timestamptz not null default now()
);

create table if not exists cajero (
  usuario_id bigint primary key references usuario(id) on delete cascade,
  -- ej. a futuro: numero_caja varchar, turno varchar, ...
  creado_en  timestamptz not null default now()
);

create table if not exists administrador (
  usuario_id bigint primary key references usuario(id) on delete cascade,
  creado_en  timestamptz not null default now()
);

-- 2) Backfill: una fila por cada usuario según su rol
insert into jefe_logistica (usuario_id) select id from usuario where rol = 'JEFE_LOGISTICA' on conflict do nothing;
insert into asesor         (usuario_id) select id from usuario where rol = 'ASESOR_VENTAS'  on conflict do nothing;
insert into cajero         (usuario_id) select id from usuario where rol = 'CAJERO'         on conflict do nothing;
insert into administrador  (usuario_id) select id from usuario where rol = 'ADMINISTRADOR'  on conflict do nothing;

-- 3) Cliente como subtipo de usuario (los clientes acceden al sistema).
--    Se conserva cliente.id (lo referencian reserva/cotizacion) y se agrega
--    el vínculo de herencia usuario_id.
alter table cliente add column if not exists usuario_id bigint unique references usuario(id);
update cliente c
set usuario_id = u.id
from usuario u
where u.cliente_id = c.id and c.usuario_id is null;

-- 4) (Recomendado) Trigger: al crear un usuario empleado, crea su fila hija
--    automáticamente, manteniendo la herencia consistente sin tocar el backend.
create or replace function usuario_crear_subtipo() returns trigger as $$
begin
  if    new.rol = 'MECANICO'       then insert into mecanico(usuario_id)       values (new.id) on conflict do nothing;
  elsif new.rol = 'JEFE_LOGISTICA' then insert into jefe_logistica(usuario_id) values (new.id) on conflict do nothing;
  elsif new.rol = 'ASESOR_VENTAS'  then insert into asesor(usuario_id)         values (new.id) on conflict do nothing;
  elsif new.rol = 'CAJERO'         then insert into cajero(usuario_id)         values (new.id) on conflict do nothing;
  elsif new.rol = 'ADMINISTRADOR'  then insert into administrador(usuario_id)  values (new.id) on conflict do nothing;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_usuario_subtipo on usuario;
create trigger trg_usuario_subtipo
  after insert on usuario
  for each row execute function usuario_crear_subtipo();

-- Nota: para CLIENTE, la fila de negocio (cliente) se crea aparte; cuando se
-- le genera una cuenta, se enlaza con cliente.usuario_id (o usuario.cliente_id).
-- Cuando el backend lea el vínculo desde cliente.usuario_id, podrás:
--   alter table usuario drop column cliente_id;
