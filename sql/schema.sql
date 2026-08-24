-- ============================================================
--  SISTEMA DE ALQUILER DE VEHICULOS - AutoRent Peru
--  MODELO DE DATOS COMPLETO (todos los modulos)
--  Motor: PostgreSQL (Supabase -> SQL Editor)
--
--  Convencion: cada entidad usa una PK surrogate "id" (bigint) y los
--  codigos de negocio (placa, numero_documento, num_poliza, ...) quedan
--  como columnas UNIQUE. Las relaciones se hacen por id.
--
--  Modulos:
--    * Seguridad:      usuario
--    * Alquiler:       cliente, vehiculo, reserva, alquiler, pago, comprobante, seguro
--    * Mantenimiento:  orden_mantenimiento, inspeccion, requerimiento_repuesto,
--                      repuesto_item, presupuesto, detalle_presupuesto,
--                      repuesto, informe_tecnico, acta_entrega
-- ============================================================

-- ---------- Reinstalacion limpia (borra todo y recrea) ----------
drop table if exists acta_entrega cascade;
drop table if exists informe_tecnico cascade;
drop table if exists detalle_presupuesto cascade;
drop table if exists presupuesto cascade;
drop table if exists repuesto_item cascade;
drop table if exists requerimiento_repuesto cascade;
drop table if exists inspeccion cascade;
drop table if exists orden_mantenimiento cascade;
drop table if exists catalogo_precio cascade;
drop table if exists comprobante cascade;
drop table if exists pago cascade;
drop table if exists alquiler cascade;
drop table if exists reserva cascade;
drop table if exists cotizacion cascade;
drop table if exists seguro cascade;
drop table if exists repuesto cascade;
drop table if exists vehiculo cascade;
drop table if exists cliente cascade;
drop table if exists usuario cascade;

-- ============================================================
--  MODULO SEGURIDAD
-- ============================================================
create table usuario (
  id            bigint generated always as identity primary key,
  nombre        varchar(100) not null,
  email         varchar(120) not null unique,
  password_hash varchar(100) not null,
  rol           varchar(20)  not null check (rol in ('JEFE_LOGISTICA', 'MECANICO', 'ADMINISTRADOR', 'ASESOR_VENTAS', 'CAJERO', 'CLIENTE')),
  cliente_id    bigint,        -- solo para rol CLIENTE (FK agregada tras crear la tabla cliente)
  estado        varchar(20)  not null default 'ACTIVO',
  creado_en     timestamptz  default now()
);

-- ============================================================
--  MODULO ALQUILER
-- ============================================================
create table cliente (
  id               bigint generated always as identity primary key,
  tipo_documento   varchar(20),          -- DNI | RUC | CE
  numero_documento varchar(20) not null unique,
  razon_social     varchar(150),         -- nombre o razon social
  licencia_conducir varchar(30),
  telefono         varchar(20),
  correo           varchar(120),
  creado_en        timestamptz default now()
);

-- FK de usuario -> cliente (se agrega aqui porque cliente se crea despues de usuario)
alter table usuario
  add constraint fk_usuario_cliente foreign key (cliente_id) references cliente(id);

create table vehiculo (
  id                          bigint generated always as identity primary key,
  placa                       varchar(10) not null unique,
  marca                       varchar(50),
  modelo                      varchar(50),
  anio                        integer,
  color                       varchar(30),
  kilometraje                 integer default 0,      -- kilometraje actual
  tarifa_diaria               numeric(10,2) default 0,
  fecha_ultimo_mantenimiento  date,
  fecha_proximo_mantenimiento date,
  estado                      varchar(20) default 'DISPONIBLE', -- DISPONIBLE | ALQUILADO | EN_MANTENIMIENTO
  creado_en                   timestamptz default now()
);

-- Cotizacion: la genera el Asesor de Ventas; el Cliente la acepta/rechaza y
-- paga la garantia. Al pagarse, el Asesor genera la Orden de Reserva.
create table cotizacion (
  id                   bigint generated always as identity primary key,
  cliente_id           bigint not null references cliente(id),
  vehiculo_id          bigint not null references vehiculo(id),
  asesor_id            bigint references usuario(id),
  fecha_inicio         date,
  fecha_fin            date,
  dias                 integer default 1,
  tarifa_dia           numeric(10,2) default 0,
  monto_total_estimado numeric(10,2) default 0,
  garantia_monto       numeric(10,2) default 0,
  -- PENDIENTE | ACEPTADA | RECHAZADA | GARANTIA_SOLICITADA | GARANTIA_PAGADA | CONVERTIDA
  estado               varchar(25) default 'PENDIENTE',
  creado_en            timestamptz default now()
);

create table reserva (
  id                   bigint generated always as identity primary key,
  cliente_id           bigint not null references cliente(id),
  vehiculo_id          bigint references vehiculo(id),
  cotizacion_id        bigint references cotizacion(id),
  fecha_solicitud      timestamptz default now(),
  fecha_inicio         date,
  fecha_fin            date,
  -- PENDIENTE_PAGO_GARANTIA | CONFIRMADA | EN_CURSO | FINALIZADA | CANCELADA
  estado               varchar(30) default 'PENDIENTE_PAGO_GARANTIA',
  monto_total_estimado numeric(10,2) default 0,
  garantia_monto       numeric(10,2) default 0,
  penalidad            numeric(10,2) default 0,
  monto_devuelto       numeric(10,2) default 0,
  motivo_cancelacion   text,
  fecha_cancelacion    timestamptz,
  creado_en            timestamptz default now()
);

create table alquiler (
  id                    bigint generated always as identity primary key,
  reserva_id            bigint references reserva(id),
  vehiculo_id           bigint not null references vehiculo(id),
  fecha_hora_entrega    timestamptz,
  fecha_hora_devolucion timestamptz,
  kilometraje_salida    integer,
  kilometraje_retorno   integer,
  estado                varchar(20) default 'ACTIVO', -- ACTIVO | FINALIZADO
  observaciones_entrega text,
  creado_en             timestamptz default now()
);

create table pago (
  id          bigint generated always as identity primary key,
  alquiler_id bigint references alquiler(id),
  reserva_id  bigint references reserva(id),
  cotizacion_id bigint references cotizacion(id),
  monto       numeric(10,2) not null default 0,
  fecha       timestamptz default now(),
  concepto    varchar(20) default 'ALQUILER', -- GARANTIA | ALQUILER | DEVOLUCION
  metodo      varchar(20),      -- TARJETA | BILLETERA | EFECTIVO | TRANSFERENCIA
  estado      varchar(20) default 'PAGADO',   -- PAGADO | RECHAZADO
  creado_en   timestamptz default now()
);

create table comprobante (
  id              bigint generated always as identity primary key,
  pago_id         bigint not null references pago(id),
  tipo            varchar(20),      -- BOLETA | FACTURA
  fecha_emision   timestamptz default now(),
  monto_total     numeric(10,2) default 0,
  archivo_xml_pdf text,             -- ruta o URL del documento
  creado_en       timestamptz default now()
);

create table seguro (
  id                  bigint generated always as identity primary key,
  vehiculo_id         bigint not null references vehiculo(id),
  tipo_seguro         varchar(30),      -- SOAT | TODO_RIESGO
  num_poliza          varchar(40) unique,
  aseguradora_entidad varchar(100),
  fecha_emision       date,
  fecha_vencimiento   date,
  archivo_adjunto     text,
  creado_en           timestamptz default now()
);

-- Catalogo de precios (tarifa por categoria de vehiculo)
create table catalogo_precio (
  id          bigint generated always as identity primary key,
  categoria   varchar(50) not null,
  descripcion varchar(150),
  precio_dia  numeric(10,2) not null default 0,
  vigente     boolean default true,
  creado_en   timestamptz default now()
);

-- ============================================================
--  MODULO MANTENIMIENTO (CUS003)
--  Estados de la Orden (BPMN):
--    PENDIENTE_INSPECCION -> INSPECCION_COMPLETA
--       -> PENDIENTE_AUTORIZACION_PRESUPUESTO
--       -> PRESUPUESTO_AUTORIZADO | CERRADA_POR_RECHAZO
--       -> EN_MANTENIMIENTO -> PENDIENTE_CONFORMIDAD
--       -> CERRADO | CORRECCION_REQUERIDA
--    Alternativo: INSPECCION_POSTERGADA
-- ============================================================
create table repuesto (
  id             bigint generated always as identity primary key,
  nombre         varchar(120) not null,
  referencia     varchar(60) unique,
  costo_unitario numeric(10,2) not null default 0,
  stock          integer not null default 0,
  creado_en      timestamptz default now()
);

create table orden_mantenimiento (
  id             bigint generated always as identity primary key,
  vehiculo_id    bigint not null references vehiculo(id),
  jefe_id        bigint references usuario(id),      -- quien crea la OM
  mecanico_id    bigint references usuario(id),      -- asignado
  tipo_servicio  varchar(100),
  descripcion    text,
  prioridad      varchar(10) default 'MEDIA',        -- ALTA | MEDIA | BAJA
  estado         varchar(35) not null default 'PENDIENTE_INSPECCION',
  hora_inicio_mant timestamptz,
  hora_fin_mant    timestamptz,
  fecha_creacion timestamptz default now(),
  fecha_cierre   timestamptz
);

create table inspeccion (
  id                 bigint generated always as identity primary key,
  orden_id           bigint not null references orden_mantenimiento(id) on delete cascade,
  diagnostico        text,
  resultado          varchar(20) default 'CON_HALLAZGOS', -- CON_HALLAZGOS | SIN_HALLAZGOS | POSTERGADA
  justificacion      text,
  necesita_repuestos boolean default false,
  kilometraje_lectura integer,
  nivel_combustible  varchar(20),
  observaciones      text,
  hora_inicio        timestamptz,
  hora_fin           timestamptz,
  creado_en          timestamptz default now()
);

create table requerimiento_repuesto (
  id         bigint generated always as identity primary key,
  orden_id   bigint not null references orden_mantenimiento(id) on delete cascade,
  estado     varchar(20) default 'SOLICITADO',  -- SOLICITADO | COMPRADO
  creado_en  timestamptz default now()
);

create table repuesto_item (
  id               bigint generated always as identity primary key,
  requerimiento_id bigint not null references requerimiento_repuesto(id) on delete cascade,
  repuesto_id      bigint references repuesto(id),
  nombre           varchar(120) not null,
  referencia       varchar(60),
  cantidad         integer not null default 1,
  precio_unitario  numeric(10,2) default 0,
  no_catalogado    boolean default false
);

create table presupuesto (
  id              bigint generated always as identity primary key,
  orden_id        bigint not null references orden_mantenimiento(id) on delete cascade,
  costo_repuestos numeric(10,2) default 0,
  costo_mano_obra numeric(10,2) default 0,
  horas_hombre    numeric(6,2) default 0,
  total           numeric(10,2) generated always as (costo_repuestos + costo_mano_obra) stored,
  estado          varchar(20) default 'PENDIENTE',  -- PENDIENTE | AUTORIZADO | RECHAZADO
  motivo_rechazo  text,
  creado_en       timestamptz default now()
);

create table detalle_presupuesto (
  id             bigint generated always as identity primary key,
  presupuesto_id bigint not null references presupuesto(id) on delete cascade,
  repuesto_id    bigint references repuesto(id),
  descripcion    varchar(120) not null,
  cantidad       integer not null default 1,
  precio_unitario numeric(10,2) not null default 0,
  subtotal       numeric(10,2) generated always as (cantidad * precio_unitario) stored
);

create table informe_tecnico (
  id                   bigint generated always as identity primary key,
  orden_id             bigint not null references orden_mantenimiento(id) on delete cascade,
  trabajos_realizados  text,
  repuestos_instalados text,
  resultados_pruebas   text,
  observaciones        text,
  conforme             boolean,
  motivo_correccion    text,
  creado_en            timestamptz default now()
);

create table acta_entrega (
  id           bigint generated always as identity primary key,
  orden_id     bigint not null unique references orden_mantenimiento(id) on delete cascade,
  generado_por bigint references usuario(id),
  contenido    text,
  fecha_entrega timestamptz default now()
);

-- ============================================================
--  DATOS DE EJEMPLO
-- ============================================================
-- Clientes (primero, para poder enlazar el usuario CLIENTE)
insert into cliente (tipo_documento, numero_documento, razon_social, licencia_conducir, telefono, correo) values
  ('DNI', '45871236', 'Carla Mendoza',       'Q45871236', '987654321', 'carla@autorent.pe'),
  ('RUC', '20512345671', 'Transportes SAC',  '-',         '01-4567890', 'ventas@transportes.pe');

-- Usuarios (contrasenas: jefe123 / mecanico123 / admin123 / asesor123 / cajero123 / cliente123)
insert into usuario (nombre, email, password_hash, rol, cliente_id) values
  ('Ana Ruiz',      'jefe@autorent.pe',     '$2a$10$.x/GETs7R/aQ92XcLguIJeHpTDNy9lkdT1ii9IFGvy.NpyjaQLfjK', 'JEFE_LOGISTICA', null),
  ('Luis Paz',      'mecanico@autorent.pe', '$2a$10$VHH77PME/T1.sJU7w9x.HORRwC.x.StF7GLvbEaym4hvrMAl81xTO', 'MECANICO', null),
  ('Sofia Vega',    'admin@autorent.pe',    '$2a$10$Mj3sii6EKlW93MSWipFLSe9gBV2phEhddju8xDyFvgAOh163oG0mC', 'ADMINISTRADOR', null),
  ('Diego Rios',    'asesor@autorent.pe',   '$2a$10$u2HAtFsSS5y5kJYe5nI.c.9m9r7YZ5o7W7f6tGWxgdo.GM6gkQbRi', 'ASESOR_VENTAS', null),
  ('Marta Lima',    'cajero@autorent.pe',   '$2a$10$6TyGrunKa4Eibc/aYH6QxeAVSvozM3LR2NUhiTDBQ9vxUQeCppaoe', 'CAJERO', null),
  ('Carla Mendoza', 'carla@autorent.pe',    '$2a$10$SEX8ramyv3td9154X1qWkeiOZp9I7iuRFKPHJHpHCYh4ss.DVm0mG', 'CLIENTE',
     (select id from cliente where numero_documento = '45871236'));

insert into vehiculo (placa, marca, modelo, anio, color, kilometraje, tarifa_diaria, fecha_ultimo_mantenimiento, fecha_proximo_mantenimiento) values
  ('ABC-123', 'Toyota', 'Yaris', 2021, 'Blanco', 48000, 120.00, '2026-02-10', '2026-08-10'),
  ('XYZ-789', 'Kia',    'Rio',   2022, 'Gris',   12000, 110.00, '2026-07-01', '2027-01-01');

insert into catalogo_precio (categoria, descripcion, precio_dia) values
  ('Economico', 'Autos compactos de bajo consumo', 110.00),
  ('Sedan',     'Autos medianos 4 puertas',        150.00),
  ('SUV',       'Camionetas familiares',           220.00),
  ('Premium',   'Vehiculos de alta gama',          350.00);

insert into repuesto (nombre, referencia, costo_unitario, stock) values
  ('Pastillas de freno delanteras', 'BR-450', 120.00, 8),
  ('Filtro de aceite',              'FO-101',  35.00, 20),
  ('Aceite sintetico 5W-30 (L)',    'AC-530',  45.00, 40),
  ('Filtro de aire',                'FA-220',  28.00, 15);
