-- ============================================================
-- Ajustes de esquema tras la revisión. Ejecutar en Supabase
-- DESPUÉS de que Render termine de redeployar el backend (~2 min),
-- porque el codigo ya migro a resolver el cliente por cliente.usuario_id.
-- ============================================================

-- FIX (IMPORTANTE): restaurar columnas propias del mecanico (Buscar Mecánico las usa)
alter table mecanico add column if not exists jornada      varchar(20) not null default 'MAÑANA'
  check (jornada in ('MAÑANA','TARDE','NOCHE'));
alter table mecanico add column if not exists especialidad varchar(60) not null default 'General';
alter table mecanico add column if not exists telefono     varchar(20);
alter table mecanico add column if not exists disponible   boolean     not null default true;

update mecanico set
  jornada      = (array['MAÑANA','TARDE','NOCHE'])[ (usuario_id % 3) + 1 ],
  especialidad = (array['Motor','Electricidad','Frenos y suspensión','General'])[ (usuario_id % 4) + 1 ];

-- ELIMINAR lo que no se usa -----------------------------------

-- Reserva: cancelación eliminada del proceso
alter table reserva drop column if exists motivo_cancelacion;
alter table reserva drop column if exists fecha_cancelacion;

-- Orden de mantenimiento: prioridad no usada
alter table orden_mantenimiento drop column if exists prioridad;

-- Presupuesto: horas_hombre no usada (total ya es columna generada)
alter table presupuesto drop column if exists horas_hombre;

-- Vínculo redundante usuario->cliente: se conserva cliente.usuario_id (herencia).
-- (El backend ya no usa usuario.cliente_id; elimina la columna y su FK.)
alter table usuario drop column if exists cliente_id;
