-- Agrega los nuevos actores/roles sin borrar datos existentes.
-- Copiar desde VS Code (no del chat) y ejecutar en Supabase -> SQL Editor.

-- 1) Ampliar los roles permitidos en usuario
alter table usuario drop constraint if exists usuario_rol_check;
alter table usuario add constraint usuario_rol_check
  check (rol in ('JEFE_LOGISTICA','MECANICO','ADMINISTRADOR','ASESOR_VENTAS','CAJERO','CLIENTE'));

-- 2) Crear los usuarios de los nuevos actores
--    (admin123 / asesor123 / cajero123)
insert into usuario (nombre, email, password_hash, rol) values
  ('Sofia Vega', 'admin@autorent.pe',  '$2a$10$Mj3sii6EKlW93MSWipFLSe9gBV2phEhddju8xDyFvgAOh163oG0mC', 'ADMINISTRADOR'),
  ('Diego Rios', 'asesor@autorent.pe', '$2a$10$u2HAtFsSS5y5kJYe5nI.c.9m9r7YZ5o7W7f6tGWxgdo.GM6gkQbRi', 'ASESOR_VENTAS'),
  ('Marta Lima', 'cajero@autorent.pe', '$2a$10$6TyGrunKa4Eibc/aYH6QxeAVSvozM3LR2NUhiTDBQ9vxUQeCppaoe', 'CAJERO')
on conflict (email) do nothing;
