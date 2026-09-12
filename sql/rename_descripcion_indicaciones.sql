-- ============================================================
-- Renombra orden_mantenimiento.descripcion -> indicaciones
-- (observaciones/indicaciones generales del Jefe para el mecánico).
-- Ejecutar en el SQL Editor de Supabase.
-- ============================================================

alter table orden_mantenimiento
  rename column descripcion to indicaciones;
