-- ============================================================
-- Limpieza del modelo de datos. Ejecutar en el SQL Editor de Supabase
-- DESPUÉS de que Render redespliegue el backend (el código ya no usa
-- estas columnas).
-- ============================================================

-- 1) vehiculo.tarifa_diaria: obsoleta (el precio vive en precio_normal/regular/campania)
alter table vehiculo drop column if exists tarifa_diaria;

-- 2) presupuesto: el Jefe ya no autoriza -> sin estado ni motivo_rechazo
alter table presupuesto drop column if exists estado;
alter table presupuesto drop column if exists motivo_rechazo;

-- 3) pago.alquiler_id: sin uso (los pagos van por reserva_id)
alter table pago drop column if exists alquiler_id;

-- 4) rol: quitar ASESOR_VENTAS del CHECK (el actor fue eliminado)
--    Primero se eliminan los usuarios con ese rol (ya no tienen acceso).
delete from usuario where rol = 'ASESOR_VENTAS';
alter table usuario drop constraint if exists usuario_rol_check;
alter table usuario add constraint usuario_rol_check
  check (rol in ('JEFE_LOGISTICA','MECANICO','ADMINISTRADOR','CAJERO','CLIENTE'));

-- Nota: si el DELETE falla por FK (el asesor referenciado en alguna orden/acta),
-- reasigna esas filas antes de borrar, o cambia el rol del usuario a otro.
