-- ============================================================
-- Precio Vehicular con patrón Cabecera/Detalle.
--   * Cabecera (precio_vehiculo): un registro de precio de un vehículo
--     (vehículo, fecha, quién lo registró).
--   * Detalle  (detalle_precio_vehiculo): los conceptos del registro
--     (ALQUILER, GARANTIA y COSTO con su monto).
-- El COSTO permite evaluar el margen (ganancia/pérdida) de cada precio.
-- Idempotente. Ejecutar en el SQL Editor de Supabase.
-- ============================================================

-- 1) Cabecera
create table if not exists precio_vehiculo (
  id             serial primary key,
  vehiculo_id    int not null references vehiculo(id) on delete cascade,
  registrado_por int references usuario(id),
  fecha          timestamptz not null default now()
);

-- 2) Detalle
create table if not exists detalle_precio_vehiculo (
  id         serial primary key,
  precio_id  int not null references precio_vehiculo(id) on delete cascade,
  concepto   text not null check (concepto in ('ALQUILER','GARANTIA','COSTO')),
  monto      numeric not null default 0
);

-- 2b) Asegura que el check acepte COSTO aunque la tabla ya existiera.
alter table detalle_precio_vehiculo drop constraint if exists detalle_precio_vehiculo_concepto_check;
alter table detalle_precio_vehiculo add constraint detalle_precio_vehiculo_concepto_check
  check (concepto in ('ALQUILER','GARANTIA','COSTO'));

-- 3) Backfill: el precio actual de cada vehículo como primer registro.
do $$
declare v record; pid int;
begin
  for v in select id, precio_normal, garantia from vehiculo loop
    if not exists (select 1 from precio_vehiculo p where p.vehiculo_id = v.id) then
      insert into precio_vehiculo (vehiculo_id) values (v.id) returning id into pid;
      insert into detalle_precio_vehiculo (precio_id, concepto, monto) values
        (pid, 'ALQUILER', coalesce(v.precio_normal, 0)),
        (pid, 'GARANTIA', coalesce(v.garantia, 0)),
        (pid, 'COSTO',    0);
    end if;
  end loop;
end $$;

-- 3b) Agrega la línea COSTO (=0) a registros previos que aún no la tengan.
insert into detalle_precio_vehiculo (precio_id, concepto, monto)
select p.id, 'COSTO', 0
from precio_vehiculo p
where not exists (
  select 1 from detalle_precio_vehiculo d
  where d.precio_id = p.id and d.concepto = 'COSTO'
);
