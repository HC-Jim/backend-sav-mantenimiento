-- ============================================================
-- Modelo de precios simplificado:
--   precio_normal  = precio de alquiler FIJO por auto (periodo por defecto: 3 días)
--   garantia       = costo de garantía FIJO por auto (nuevo)
-- Ejecutar en el SQL Editor de Supabase.
-- ============================================================

-- 1) Nueva columna de garantía fija
alter table vehiculo add column if not exists garantia numeric not null default 0;

-- 2) (Opcional) limpiar columnas de precios que ya no se usan
alter table vehiculo drop column if exists precio_regular;
alter table vehiculo drop column if exists precio_campania;
alter table vehiculo drop column if exists dias_min_campania;
