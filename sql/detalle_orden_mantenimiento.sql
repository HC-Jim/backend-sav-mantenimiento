-- ============================================================
-- Patrón Cabecera/Detalle para la Orden de Mantenimiento.
--   * Cabecera (orden_mantenimiento): vehículo, jefe, estado, fechas.
--   * Detalle  (detalle_orden_mantenimiento): mecánico, tipo, indicaciones.
-- El detalle incluye los CU «Buscar Mecánico» y «Buscar Vehículo» al registrar.
-- Idempotente: se puede correr varias veces sin error.
-- Ejecutar en el SQL Editor de Supabase.
-- ============================================================

-- 1) Tabla de detalle
create table if not exists detalle_orden_mantenimiento (
  id                    serial primary key,
  orden_id              int not null references orden_mantenimiento(id) on delete cascade,
  mecanico_id           int references usuario(id),
  tipo_mantenimiento_id int references tipo_mantenimiento(id),
  indicaciones          text
);

-- 2) Copia el detalle desde la cabecera SOLO si esas columnas aún existen
--    (para bases que todavía no se migraron). En bases ya migradas no hace nada.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'orden_mantenimiento' and column_name = 'mecanico_id'
  ) then
    insert into detalle_orden_mantenimiento (orden_id, mecanico_id, tipo_mantenimiento_id, indicaciones)
    select o.id, o.mecanico_id, o.tipo_mantenimiento_id, o.indicaciones
    from orden_mantenimiento o
    where not exists (
      select 1 from detalle_orden_mantenimiento d where d.orden_id = o.id
    );
  end if;
end $$;

-- 3) Campos adicionales del detalle (prioridad, km de ingreso, fecha
--    programada y costo estimado del mantenimiento).
alter table detalle_orden_mantenimiento add column if not exists prioridad       text default 'MEDIA';
alter table detalle_orden_mantenimiento add column if not exists km_ingreso      int;
alter table detalle_orden_mantenimiento add column if not exists fecha_programada date;
alter table detalle_orden_mantenimiento add column if not exists costo_estimado  numeric;
