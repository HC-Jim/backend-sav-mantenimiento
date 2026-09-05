-- ============================================================
-- Tabla mecanico (1:1 con usuario) — datos específicos del rol MECANICO.
-- usuario  = identidad y credenciales (id, nombre, email, password, rol).
-- mecanico = atributos propios del mecánico (jornada, especialidad, etc.).
-- Ejecutar en el SQL Editor de Supabase.
-- ============================================================

create table if not exists mecanico (
  usuario_id    bigint primary key references usuario(id) on delete cascade,
  jornada       varchar(20) not null default 'MAÑANA'
                check (jornada in ('MAÑANA','TARDE','NOCHE')),
  especialidad  varchar(60) not null default 'General',
  telefono      varchar(20),
  disponible    boolean     not null default true,
  creado_en     timestamptz not null default now()
);

-- Una fila por cada usuario con rol MECANICO (valores de ejemplo variados).
insert into mecanico (usuario_id, jornada, especialidad)
select u.id,
       (array['MAÑANA','TARDE','NOCHE'])[ (u.id % 3) + 1 ],
       (array['Motor','Electricidad','Frenos y suspensión','General'])[ (u.id % 4) + 1 ]
from usuario u
where u.rol = 'MECANICO'
on conflict (usuario_id) do nothing;
