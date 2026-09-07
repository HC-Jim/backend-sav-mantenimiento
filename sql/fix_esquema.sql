-- ============================================================
-- Ajustes de esquema tras la revisión. Ejecutar en Supabase.
-- ============================================================

-- FIX 1 (IMPORTANTE): la tabla mecanico perdió sus columnas propias, pero
-- "Buscar Mecánico" (backend) las consulta. Se restauran.
alter table mecanico add column if not exists jornada      varchar(20) not null default 'MAÑANA'
  check (jornada in ('MAÑANA','TARDE','NOCHE'));
alter table mecanico add column if not exists especialidad varchar(60) not null default 'General';
alter table mecanico add column if not exists telefono     varchar(20);
alter table mecanico add column if not exists disponible   boolean     not null default true;

-- Valores de ejemplo variados (opcional)
update mecanico set
  jornada      = (array['MAÑANA','TARDE','NOCHE'])[ (usuario_id % 3) + 1 ],
  especialidad = (array['Motor','Electricidad','Frenos y suspensión','General'])[ (usuario_id % 4) + 1 ];

-- LIMPIEZA (de más): columnas de cancelación ya no usadas en reserva
alter table reserva drop column if exists motivo_cancelacion;
alter table reserva drop column if exists fecha_cancelacion;

-- LIMPIEZA opcional: campos sin uso en la app
-- alter table orden_mantenimiento drop column if exists prioridad;
-- alter table presupuesto          drop column if exists horas_hombre;

-- REDUNDANCIA: usuario.cliente_id vs cliente.usuario_id (doble vínculo 1:1).
-- NO lo dropees todavía: el backend aún resuelve el cliente por usuario.cliente_id.
-- Cuando migremos el código a leer cliente.usuario_id, recién:
-- alter table usuario drop column if exists cliente_id;
