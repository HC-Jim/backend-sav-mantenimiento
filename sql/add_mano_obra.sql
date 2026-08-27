-- ============================================================
--  Mano de obra (paso aparte del presupuesto, con aprobación)
--  Incremental: no borra datos. Ejecutar en Supabase (SQL Editor).
-- ============================================================
create table if not exists mano_obra (
  id          bigint generated always as identity primary key,
  orden_id    bigint not null references orden_mantenimiento(id) on delete cascade,
  costo       numeric(10,2) not null default 0,
  observacion text,
  estado      varchar(20) default 'SOLICITADO',   -- SOLICITADO | APROBADO
  creado_en   timestamptz default now()
);
