-- Limpia las cotizaciones y reservas del cliente Carla (doc 45871236),
-- incluyendo sus pagos, comprobantes y alquileres asociados.
-- Copiar desde VS Code y ejecutar en Supabase -> SQL Editor.

-- id del cliente Carla
with carla as (
  select id from cliente where numero_documento = '45871236'
),
-- ids de sus reservas y cotizaciones
res as (
  select id from reserva where cliente_id in (select id from carla)
),
cot as (
  select id from cotizacion where cliente_id in (select id from carla)
),
-- pagos ligados a esas reservas o cotizaciones
pagos as (
  select id from pago
  where reserva_id in (select id from res)
     or cotizacion_id in (select id from cot)
)
-- 1) comprobantes de esos pagos
delete from comprobante where pago_id in (select id from pagos);

-- 2) pagos (reserva o cotizacion de Carla)
delete from pago
where reserva_id in (select id from reserva where cliente_id = (select id from cliente where numero_documento = '45871236'))
   or cotizacion_id in (select id from cotizacion where cliente_id = (select id from cliente where numero_documento = '45871236'));

-- 3) alquileres de sus reservas
delete from alquiler
where reserva_id in (select id from reserva where cliente_id = (select id from cliente where numero_documento = '45871236'));

-- 4) reservas
delete from reserva where cliente_id = (select id from cliente where numero_documento = '45871236');

-- 5) cotizaciones
delete from cotizacion where cliente_id = (select id from cliente where numero_documento = '45871236');
