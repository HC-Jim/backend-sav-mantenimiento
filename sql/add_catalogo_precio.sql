-- Agrega SOLO el catalogo de precios (no borra datos existentes).
-- Ejecutar una vez en Supabase -> SQL Editor.

create table if not exists catalogo_precio (
  id          bigint generated always as identity primary key,
  categoria   varchar(50) not null,
  descripcion varchar(150),
  precio_dia  numeric(10,2) not null default 0,
  vigente     boolean default true,
  creado_en   timestamptz default now()
);

insert into catalogo_precio (categoria, descripcion, precio_dia) values
  ('Economico', 'Autos compactos de bajo consumo', 110.00),
  ('Sedan',     'Autos medianos 4 puertas',        150.00),
  ('SUV',       'Camionetas familiares',           220.00),
  ('Premium',   'Vehiculos de alta gama',          350.00);
