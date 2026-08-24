-- ============================================================
--  SISTEMA DE ALQUILER DE VEHICULOS - AutoRent Peru
--  Modulo: GESTION DE ORDENES DE MANTENIMIENTO (CUS003)
--  Motor: PostgreSQL (Supabase -> SQL Editor)
--
--  Estados de la Orden de Mantenimiento (segun el informe / BPMN):
--    PENDIENTE_INSPECCION -> INSPECCION_COMPLETA
--         -> PENDIENTE_AUTORIZACION_PRESUPUESTO
--         -> PRESUPUESTO_AUTORIZADO | CERRADA_POR_RECHAZO
--         -> EN_MANTENIMIENTO -> PENDIENTE_CONFORMIDAD
--         -> CERRADO | CORRECCION_REQUERIDA
--    Alternativo: INSPECCION_POSTERGADA
-- ============================================================

-- Para reinstalar desde cero, descomenta el bloque siguiente:
-- drop table if exists acta_entrega, informe_tecnico, detalle_presupuesto,
--   presupuesto, repuesto_item, requerimiento_repuesto, inspeccion,
--   orden_mantenimiento, repuesto, vehiculo, usuario cascade;

-- ---------- USUARIO (actores del proceso) ----------
create table if not exists usuario (
  id            bigint generated always as identity primary key,
  nombre        varchar(100) not null,
  email         varchar(120) not null unique,
  password_hash varchar(100) not null,
  rol           varchar(20)  not null check (rol in ('JEFE_LOGISTICA', 'MECANICO')),
  estado        varchar(20)  not null default 'ACTIVO',
  creado_en     timestamptz  default now()
);

-- ---------- VEHICULO ----------
create table if not exists vehiculo (
  id                          bigint generated always as identity primary key,
  placa                       varchar(10) not null unique,
  marca                       varchar(50),
  modelo                      varchar(50),
  anio                        integer,
  kilometraje                 integer default 0,
  fecha_ultimo_mantenimiento  date,
  fecha_proximo_mantenimiento date,
  estado                      varchar(20) default 'DISPONIBLE',  -- DISPONIBLE | EN_MANTENIMIENTO
  creado_en                   timestamptz default now()
);

-- ---------- REPUESTO (catalogo con stock) ----------
create table if not exists repuesto (
  id             bigint generated always as identity primary key,
  nombre         varchar(120) not null,
  referencia     varchar(60) unique,
  costo_unitario numeric(10,2) not null default 0,
  stock          integer not null default 0,
  creado_en      timestamptz default now()
);

-- ---------- ORDEN DE MANTENIMIENTO (OM) ----------
-- Documento central del flujo. La columna "estado" refleja el avance en el BPMN.
create table if not exists orden_mantenimiento (
  id             bigint generated always as identity primary key,
  vehiculo_id    bigint not null references vehiculo(id),
  jefe_id        bigint references usuario(id),      -- quien crea la OM
  mecanico_id    bigint references usuario(id),      -- asignado
  tipo_servicio  varchar(100),
  descripcion    text,
  estado         varchar(35) not null default 'PENDIENTE_INSPECCION',
  hora_inicio_mant timestamptz,   -- "Iniciar Mantenimiento" (SLA)
  hora_fin_mant    timestamptz,   -- "Finalizar Mantenimiento" (SLA)
  fecha_creacion timestamptz default now(),
  fecha_cierre   timestamptz
);

-- ---------- INSPECCION (Detalle de Inspeccion) ----------
create table if not exists inspeccion (
  id                 bigint generated always as identity primary key,
  orden_id           bigint not null references orden_mantenimiento(id) on delete cascade,
  diagnostico        text,
  resultado          varchar(20) default 'CON_HALLAZGOS', -- CON_HALLAZGOS | SIN_HALLAZGOS | POSTERGADA
  justificacion      text,               -- si se posterga
  necesita_repuestos boolean default false,
  kilometraje_lectura integer,
  nivel_combustible  varchar(20),
  observaciones      text,
  hora_inicio        timestamptz,
  hora_fin           timestamptz,
  creado_en          timestamptz default now()
);

-- ---------- REQUERIMIENTO / REQUISICION DE REPUESTOS ----------
create table if not exists requerimiento_repuesto (
  id         bigint generated always as identity primary key,
  orden_id   bigint not null references orden_mantenimiento(id) on delete cascade,
  estado     varchar(20) default 'SOLICITADO',  -- SOLICITADO | COMPRADO
  creado_en  timestamptz default now()
);

create table if not exists repuesto_item (
  id               bigint generated always as identity primary key,
  requerimiento_id bigint not null references requerimiento_repuesto(id) on delete cascade,
  repuesto_id      bigint references repuesto(id),  -- null = item no catalogado
  nombre           varchar(120) not null,
  referencia       varchar(60),
  cantidad         integer not null default 1,
  precio_unitario  numeric(10,2) default 0,
  no_catalogado    boolean default false  -- flujo alt: "Pendiente de Cotizacion Externa"
);

-- ---------- PRESUPUESTO (cabecera + detalle) ----------
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

create table if not exists detalle_presupuesto (
  id             bigint generated always as identity primary key,
  presupuesto_id bigint not null references presupuesto(id) on delete cascade,
  repuesto_id    bigint references repuesto(id),
  descripcion    varchar(120) not null,
  cantidad       integer not null default 1,
  precio_unitario numeric(10,2) not null default 0,
  subtotal       numeric(10,2) generated always as (cantidad * precio_unitario) stored
);

-- ---------- INFORME TECNICO ----------
create table if not exists informe_tecnico (
  id                   bigint generated always as identity primary key,
  orden_id             bigint not null references orden_mantenimiento(id) on delete cascade,
  trabajos_realizados  text,
  repuestos_instalados text,
  resultados_pruebas   text,
  observaciones        text,
  conforme             boolean,          -- lo marca el Jefe al dar conformidad
  motivo_correccion    text,             -- si el Jefe rechaza la conformidad
  creado_en            timestamptz default now()
);

-- ---------- ACTA DE ENTREGA (se genera al cerrar) ----------
create table if not exists acta_entrega (
  id           bigint generated always as identity primary key,
  orden_id     bigint not null unique references orden_mantenimiento(id) on delete cascade,
  generado_por bigint references usuario(id),
  contenido    text,
  fecha_entrega timestamptz default now()
);

-- ============================================================
--  DATOS DE EJEMPLO
-- ============================================================

-- Usuarios (contrasenas: jefe123 / mecanico123)
insert into usuario (nombre, email, password_hash, rol) values
  ('Ana Ruiz',  'jefe@autorent.pe',     '$2a$10$.x/GETs7R/aQ92XcLguIJeHpTDNy9lkdT1ii9IFGvy.NpyjaQLfjK', 'JEFE_LOGISTICA'),
  ('Luis Paz',  'mecanico@autorent.pe', '$2a$10$VHH77PME/T1.sJU7w9x.HORRwC.x.StF7GLvbEaym4hvrMAl81xTO', 'MECANICO')
on conflict (email) do nothing;

-- Vehiculos
insert into vehiculo (placa, marca, modelo, anio, kilometraje, fecha_ultimo_mantenimiento, fecha_proximo_mantenimiento)
values
  ('ABC-123', 'Toyota', 'Yaris', 2021, 48000, '2026-02-10', '2026-08-10'),
  ('XYZ-789', 'Kia',    'Rio',   2022, 12000, '2026-07-01', '2027-01-01')
on conflict (placa) do nothing;

-- Catalogo de repuestos
insert into repuesto (nombre, referencia, costo_unitario, stock) values
  ('Pastillas de freno delanteras', 'BR-450', 120.00, 8),
  ('Filtro de aceite',              'FO-101',  35.00, 20),
  ('Aceite sintetico 5W-30 (L)',    'AC-530',  45.00, 40),
  ('Filtro de aire',                'FA-220',  28.00, 15)
on conflict (referencia) do nothing;
