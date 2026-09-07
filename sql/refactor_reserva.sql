-- ============================================================
-- Refactor del proceso de reserva.
-- Nuevo flujo: Generar Orden de Reserva (POR_PAGAR) -> Pagar (RESERVADO)
--              -> Devolver Garantia (FINALIZADA).
-- Se elimina cotizacion y el actor Asesor.
-- Ejecutar en el SQL Editor de Supabase.
-- ============================================================

-- 1) Migrar estados de reserva existentes al nuevo modelo
update reserva set estado = 'POR_PAGAR'  where estado in ('PENDIENTE_APROBACION','PENDIENTE_PAGO_GARANTIA');
update reserva set estado = 'RESERVADO'  where estado in ('CONFIRMADA','EN_CURSO');
update reserva set estado = 'FINALIZADA' where estado = 'CANCELADA';

-- 2) Quitar dependencia de cotizacion
alter table reserva drop column if exists cotizacion_id;
alter table pago    drop column if exists cotizacion_id;
drop table if exists cotizacion cascade;

-- 3) (Opcional) quitar rastros del actor Asesor de Ventas
drop table if exists asesor cascade;
-- Si tienes usuarios ASESOR_VENTAS y quieres desactivarlos (no borrarlos):
-- update usuario set estado = 'INACTIVO' where rol = 'ASESOR_VENTAS';

-- 4) (Opcional, limpieza) columnas de cancelacion ya no usadas en reserva:
-- alter table reserva drop column if exists motivo_cancelacion;
-- alter table reserva drop column if exists fecha_cancelacion;
