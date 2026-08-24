-- Migracion: SKU + categoria en vehiculo, y precios por categoria (regular/normal/campania).
-- No borra datos. Copiar desde VS Code y ejecutar en Supabase -> SQL Editor.

-- 1) Vehiculo: SKU y categoria
alter table vehiculo add column if not exists sku varchar(30);
alter table vehiculo add column if not exists categoria varchar(50);
update vehiculo set sku = 'VH-' || lpad(id::text, 4, '0') where sku is null;
update vehiculo set categoria = 'Economico' where categoria is null;

-- 2) Catalogo de precios: nuevas columnas
alter table catalogo_precio add column if not exists precio_regular    numeric(10,2) not null default 0;
alter table catalogo_precio add column if not exists precio_normal     numeric(10,2) not null default 0;
alter table catalogo_precio add column if not exists precio_campania   numeric(10,2) not null default 0;
alter table catalogo_precio add column if not exists dias_min_campania integer      not null default 7;

-- 3) Migrar el precio antiguo (precio_dia) si existiera
update catalogo_precio set precio_normal   = precio_dia            where precio_normal   = 0 and precio_dia is not null;
update catalogo_precio set precio_regular  = round(precio_normal * 1.2, 2) where precio_regular  = 0;
update catalogo_precio set precio_campania = round(precio_normal * 0.9, 2) where precio_campania = 0;
alter table catalogo_precio drop column if exists precio_dia;
