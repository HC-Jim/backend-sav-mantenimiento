-- ============================================================
-- Patrón Cabecera/Detalle para la Orden de Mantenimiento.
--   * Cabecera (orden_mantenimiento): vehículo, jefe, estado, fecha.
--   * Detalle  (detalle_orden_mantenimiento): mecánico, tipo, indicaciones.
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

-- 2) Migra el detalle de las órdenes existentes (cabecera -> detalle)
insert into detalle_orden_mantenimiento (orden_id, mecanico_id, tipo_mantenimiento_id, indicaciones)
select id, mecanico_id, tipo_mantenimiento_id, indicaciones
from orden_mantenimiento
where not exists (
  select 1 from detalle_orden_mantenimiento d where d.orden_id = orden_mantenimiento.id
);

-- 3) La cabecera ya no guarda estos campos (quedan solo en el detalle)
alter table orden_mantenimiento drop column if exists mecanico_id;
alter table orden_mantenimiento drop column if exists tipo_mantenimiento_id;
alter table orden_mantenimiento drop column if exists indicaciones;
