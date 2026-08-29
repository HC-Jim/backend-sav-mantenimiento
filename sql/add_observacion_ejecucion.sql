-- Observación (puntos clave) del proceso de ejecución del mantenimiento.
-- Incremental: no borra datos. Ejecutar en Supabase (SQL Editor).
alter table orden_mantenimiento
  add column if not exists observacion_ejecucion text;
