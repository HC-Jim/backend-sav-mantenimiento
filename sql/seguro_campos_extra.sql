-- ============================================================
-- Campos adicionales para la póliza de seguro (Registrar Seguro).
--   * deducible: monto deducible ante siniestro.
--   * frecuencia_pago: MENSUAL / TRIMESTRAL / SEMESTRAL / ANUAL.
--   * moneda: PEN / USD.
--   * contacto_aseguradora: teléfono o correo de la aseguradora / corredor.
-- (suma_asegurada, prima, cobertura y observaciones ya existen.)
-- Idempotente. Ejecutar en el SQL Editor de Supabase.
-- ============================================================
alter table seguro add column if not exists deducible            numeric;
alter table seguro add column if not exists frecuencia_pago      text;
alter table seguro add column if not exists moneda               text default 'PEN';
alter table seguro add column if not exists contacto_aseguradora text;
