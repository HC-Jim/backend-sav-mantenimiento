-- ============================================================
-- Nuevas funcionalidades:
--   * Pago con Tarjeta (crédito/débito, cuotas) o Yape (celular + operación)
--   * Cupones de descuento (porcentaje o monto), con marca de "usado"
--   * Historial de precios por vehículo (último, promedio, variación)
--   * Seguro con campos adicionales
-- Ejecutar en el SQL Editor de Supabase.
-- ============================================================

-- 1) CUPONES -------------------------------------------------
create table if not exists cupon (
  id           serial primary key,
  codigo       text unique not null,
  descripcion  text,
  tipo         text not null check (tipo in ('PORCENTAJE','MONTO')),
  valor        numeric not null default 0,
  usado        boolean not null default false,
  activo       boolean not null default true,
  fecha_uso    timestamptz
);

insert into cupon (codigo, descripcion, tipo, valor) values
  ('BIENVENIDA10', '10% de descuento de bienvenida',        'PORCENTAJE', 10),
  ('VERANO20',     '20% de descuento campaña de verano',    'PORCENTAJE', 20),
  ('DESC50',       'S/ 50 de descuento en el alquiler',     'MONTO',      50),
  ('DESC100',      'S/ 100 de descuento en el alquiler',    'MONTO',      100)
on conflict (codigo) do nothing;

-- 2) PAGO: método y datos de tarjeta / yape / cupón ---------
alter table pago add column if not exists tipo_tarjeta     text;   -- CREDITO / DEBITO
alter table pago add column if not exists cuotas           int;    -- solo crédito
alter table pago add column if not exists tarjeta_ultimos4 text;   -- NO se guarda el número completo ni el CVV
alter table pago add column if not exists tarjeta_marca    text;   -- VISA / MASTERCARD / etc.
alter table pago add column if not exists yape_celular     text;
alter table pago add column if not exists yape_operacion   text;
alter table pago add column if not exists cupon_id         int references cupon(id);
alter table pago add column if not exists descuento        numeric not null default 0;

-- 3) HISTORIAL DE PRECIOS ------------------------------------
create table if not exists historial_precio (
  id            serial primary key,
  vehiculo_id   int not null references vehiculo(id) on delete cascade,
  precio_normal numeric not null default 0,
  garantia      numeric not null default 0,
  fecha         timestamptz not null default now()
);

-- Backfill: registra el precio actual de cada vehículo como primer punto.
insert into historial_precio (vehiculo_id, precio_normal, garantia)
select id, precio_normal, garantia from vehiculo;

-- 4) SEGURO: campos adicionales ------------------------------
alter table seguro add column if not exists suma_asegurada numeric;
alter table seguro add column if not exists prima          numeric;
alter table seguro add column if not exists cobertura      text;
alter table seguro add column if not exists observaciones  text;
