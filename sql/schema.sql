-- ============================================================
--  PROCESO DE MANTENIMIENTO PREVENTIVO
--  Ejecutar en Supabase -> SQL Editor
-- ============================================================

-- ---------- VEHICULO ----------
create table if not exists vehiculo (
  id                        bigint generated always as identity primary key,
  placa                     varchar(10) not null unique,
  marca                     varchar(50),
  modelo                    varchar(50),
  kilometraje               integer default 0,
  fecha_ultimo_mantenimiento date,
  fecha_proximo_mantenimiento date,
  estado                    varchar(20) default 'DISPONIBLE',  -- DISPONIBLE | EN_MANTENIMIENTO
  creado_en                 timestamptz default now()
);

-- ---------- ORDEN DE MANTENIMIENTO (OM) ----------
-- Documento central del flujo. Su columna "estado" representa el avance en el BPMN.
create table if not exists orden_mantenimiento (
  id             bigint generated always as identity primary key,
  vehiculo_id    bigint not null references vehiculo(id),
  jefe_logistica varchar(100),          -- quien crea la OM
  mecanico       varchar(100),          -- asignado
  tipo_servicio  varchar(100),          -- ej. "Mantenimiento preventivo 10,000 km"
  descripcion    text,
  estado         varchar(30) not null default 'CREADA',
  -- Estados posibles (siguen el BPMN):
  -- CREADA -> INSPECCIONADA -> PRESUPUESTO_GENERADO ->
  -- AUTORIZADA / RECHAZADA -> EN_MANTENIMIENTO -> INFORME_GENERADO ->
  -- CERRADA -> ENTREGADA
  fecha_creacion timestamptz default now(),
  fecha_cierre   timestamptz
);

-- ---------- INSPECCION ----------
create table if not exists inspeccion (
  id                bigint generated always as identity primary key,
  orden_id          bigint not null references orden_mantenimiento(id) on delete cascade,
  diagnostico       text,
  necesita_repuestos boolean default false,
  hora_inicio       timestamptz,
  hora_fin          timestamptz,
  creado_en         timestamptz default now()
);

-- ---------- REQUERIMIENTO / REQUISICION DE REPUESTOS ----------
create table if not exists requerimiento_repuesto (
  id         bigint generated always as identity primary key,
  orden_id   bigint not null references orden_mantenimiento(id) on delete cascade,
  estado     varchar(20) default 'SOLICITADO',  -- SOLICITADO | COMPRADO
  creado_en  timestamptz default now()
);

create table if not exists repuesto_item (
  id                bigint generated always as identity primary key,
  requerimiento_id  bigint not null references requerimiento_repuesto(id) on delete cascade,
  nombre            varchar(120) not null,
  referencia        varchar(60),
  cantidad          integer not null default 1,
  precio_unitario   numeric(10,2) default 0
);

-- ---------- PRESUPUESTO ----------
create table if not exists presupuesto (
  id              bigint generated always as identity primary key,
  orden_id        bigint not null references orden_mantenimiento(id) on delete cascade,
  costo_repuestos numeric(10,2) default 0,
  costo_mano_obra numeric(10,2) default 0,
  total           numeric(10,2) generated always as (costo_repuestos + costo_mano_obra) stored,
  estado          varchar(20) default 'PENDIENTE',  -- PENDIENTE | AUTORIZADO | RECHAZADO
  motivo_rechazo  text,
  creado_en       timestamptz default now()
);

-- ---------- INFORME TECNICO ----------
create table if not exists informe_tecnico (
  id                  bigint generated always as identity primary key,
  orden_id            bigint not null references orden_mantenimiento(id) on delete cascade,
  trabajos_realizados text,
  repuestos_instalados text,
  resultados_pruebas  text,
  observaciones       text,
  tiempo_inicio       timestamptz,
  tiempo_fin          timestamptz,
  conforme            boolean,          -- lo marca el Jefe al dar conformidad
  creado_en           timestamptz default now()
);

-- ---------- Datos de ejemplo ----------
insert into vehiculo (placa, marca, modelo, kilometraje, fecha_ultimo_mantenimiento, fecha_proximo_mantenimiento)
values
  ('ABC-123', 'Toyota', 'Yaris', 48000, '2026-02-10', '2026-08-10'),
  ('XYZ-789', 'Kia',    'Rio',   12000, '2026-07-01', '2027-01-01')
on conflict (placa) do nothing;
