-- Agrega el flujo de ventas (cotizacion) sin borrar datos existentes.
-- Copiar desde VS Code y ejecutar en Supabase -> SQL Editor.

create table if not exists cotizacion (
  id                   bigint generated always as identity primary key,
  cliente_id           bigint not null references cliente(id),
  vehiculo_id          bigint not null references vehiculo(id),
  asesor_id            bigint references usuario(id),
  fecha_inicio         date,
  fecha_fin            date,
  dias                 integer default 1,
  tarifa_dia           numeric(10,2) default 0,
  monto_total_estimado numeric(10,2) default 0,
  garantia_monto       numeric(10,2) default 0,
  estado               varchar(25) default 'PENDIENTE',
  creado_en            timestamptz default now()
);

alter table reserva add column if not exists cotizacion_id bigint references cotizacion(id);
alter table pago    add column if not exists cotizacion_id bigint references cotizacion(id);
