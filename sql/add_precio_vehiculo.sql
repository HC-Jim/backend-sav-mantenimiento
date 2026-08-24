-- Mueve el precio al vehiculo (regular/normal/campania) y elimina catalogo_precio.
-- No borra vehiculos ni reservas. Copiar desde VS Code y ejecutar en Supabase.

-- 1) Columnas de precio en el vehiculo
alter table vehiculo add column if not exists precio_regular    numeric(10,2) not null default 0;
alter table vehiculo add column if not exists precio_normal     numeric(10,2) not null default 0;
alter table vehiculo add column if not exists precio_campania   numeric(10,2) not null default 0;
alter table vehiculo add column if not exists dias_min_campania integer      not null default 7;

-- 2) Migrar precios desde catalogo_precio (por categoria) si esa tabla existe
do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'catalogo_precio') then
    update vehiculo v set
      precio_regular    = c.precio_regular,
      precio_normal     = c.precio_normal,
      precio_campania   = c.precio_campania,
      dias_min_campania = c.dias_min_campania
    from catalogo_precio c
    where v.categoria = c.categoria;
    drop table catalogo_precio cascade;
  end if;
end $$;

-- 3) Valores por defecto para vehiculos sin precio (ajustalos luego en Catalogo de Precios)
update vehiculo set precio_regular = 130, precio_normal = 110, precio_campania = 95 where precio_normal = 0;
