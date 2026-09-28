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

-- 2) Copia el detalle de las órdenes existentes (cabecera -> detalle)
--    La cabecera CONSERVA sus columnas (se usan en otros casos de uso);
--    el detalle es una tabla adicional, no un reemplazo.
insert into detalle_orden_mantenimiento (orden_id, mecanico_id, tipo_mantenimiento_id, indicaciones)
select id, mecanico_id, tipo_mantenimiento_id, indicaciones
from orden_mantenimiento
where not exists (
  select 1 from detalle_orden_mantenimiento d where d.orden_id = orden_mantenimiento.id
);
