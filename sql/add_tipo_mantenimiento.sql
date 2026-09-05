-- ============================================================
-- Catálogo de Tipos de Mantenimiento (CE_TipoMantenimiento)
-- Normaliza el antiguo texto libre orden_mantenimiento.tipo_servicio.
-- Ejecutar en el SQL Editor de Supabase.
-- ============================================================

-- 1) Tabla catálogo
create table if not exists tipo_mantenimiento (
  id                       bigint generated always as identity primary key,
  codigo                   varchar(20)  not null unique,        -- PREV, CORR, PRED...
  nombre                   varchar(80)  not null,               -- "Preventivo"
  descripcion              text,
  categoria                varchar(20)  not null default 'PROGRAMADO'
                           check (categoria in ('PROGRAMADO','NO_PROGRAMADO')),
  frecuencia_km            integer,                             -- cada N km (preventivo)
  frecuencia_dias          integer,                             -- cada N días
  duracion_estimada_horas  numeric(5,2),                        -- estimado de mano de obra
  activo                   boolean      not null default true,
  creado_en                timestamptz  not null default now()
);

-- 2) Instancias iniciales (upsert por codigo: no duplica si ya existen)
insert into tipo_mantenimiento
  (codigo, nombre, descripcion, categoria, frecuencia_km, frecuencia_dias, duracion_estimada_horas)
values
  ('PREV', 'Preventivo',  'Mantenimiento programado por kilometraje o tiempo para prevenir fallas.', 'PROGRAMADO',     5000,  180, 2.5),
  ('CORR', 'Correctivo',  'Reparación de una falla o avería ya presentada en el vehículo.',          'NO_PROGRAMADO',  null,  null, 4.0),
  ('PRED', 'Predictivo',  'Intervención basada en el diagnóstico/condición detectada en inspección.','PROGRAMADO',     null,  90,  3.0),
  ('REV',  'Revisión técnica', 'Revisión integral para certificación o control periódico.',          'PROGRAMADO',     null,  365, 1.5)
on conflict (codigo) do update set
  nombre                  = excluded.nombre,
  descripcion             = excluded.descripcion,
  categoria               = excluded.categoria,
  frecuencia_km           = excluded.frecuencia_km,
  frecuencia_dias         = excluded.frecuencia_dias,
  duracion_estimada_horas = excluded.duracion_estimada_horas;

-- 3) FK en orden_mantenimiento
alter table orden_mantenimiento
  add column if not exists tipo_mantenimiento_id bigint references tipo_mantenimiento(id);

-- 4) Backfill: mapea el texto libre anterior al nuevo catálogo (mejor esfuerzo)
update orden_mantenimiento o
set tipo_mantenimiento_id = t.id
from tipo_mantenimiento t
where o.tipo_mantenimiento_id is null
  and (
        (t.codigo = 'PREV' and o.tipo_servicio ilike 'prev%')
     or (t.codigo = 'CORR' and o.tipo_servicio ilike 'corr%')
     or (t.codigo = 'PRED' and o.tipo_servicio ilike 'pred%')
     or (t.codigo = 'REV'  and o.tipo_servicio ilike 'rev%')
  );

-- Las órdenes con texto no reconocible (asd, rfg, rpev...) quedan sin tipo:
-- asígnalas por defecto a Correctivo para no dejarlas nulas (opcional).
update orden_mantenimiento o
set tipo_mantenimiento_id = (select id from tipo_mantenimiento where codigo = 'CORR')
where o.tipo_mantenimiento_id is null;

-- 5) (Opcional, cuando el backend/front ya usen el FK) eliminar el texto libre:
-- alter table orden_mantenimiento drop column if exists tipo_servicio;
