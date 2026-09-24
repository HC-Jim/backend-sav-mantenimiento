-- ============================================================
-- Reseteo + datos de demo para el alcance vigente.
-- Requisitos previos:
--   * Haber corrido la limpieza de tablas viejas (drop de inspeccion,
--     presupuesto, alquiler, etc.). Si NO lo hiciste, primero córrela,
--     porque el DELETE de orden_mantenimiento/reserva puede fallar por FK.
-- Ejecutar en el SQL Editor de Supabase.
-- ============================================================

-- 0) Columna de garantía fija (idempotente)
alter table vehiculo add column if not exists garantia numeric not null default 0;

-- 1) Reset de datos operativos (hijos primero por las FKs)
delete from comprobante;
delete from pago;
delete from reserva;
delete from orden_mantenimiento;
delete from seguro;

-- 2) Precio de alquiler fijo + garantía por categoría, y flota DISPONIBLE
update vehiculo set precio_normal = 300,  garantia = 500  where categoria = 'Economico';
update vehiculo set precio_normal = 450,  garantia = 800  where categoria = 'Sedan';
update vehiculo set precio_normal = 650,  garantia = 1200 where categoria = 'SUV';
update vehiculo set precio_normal = 1000, garantia = 2000 where categoria = 'Premium';
update vehiculo set estado = 'DISPONIBLE';

-- 3) Un seguro registrado (BMW X5 · YZA-135)
insert into seguro (vehiculo_id, tipo_seguro, num_poliza, aseguradora_entidad, fecha_emision, fecha_vencimiento)
select id, 'SOAT', 'POL-2026-001', 'Rimac Seguros', '2026-01-01', '2026-12-31'
from vehiculo where placa = 'YZA-135';

-- 4) Una orden de mantenimiento registrada (Kia Rio · XYZ-789)
insert into orden_mantenimiento (vehiculo_id, jefe_id, mecanico_id, tipo_mantenimiento_id, estado, indicaciones)
values (
  (select id from vehiculo          where placa = 'XYZ-789'),
  (select id from usuario           where rol = 'JEFE_LOGISTICA' order by id limit 1),
  (select id from usuario           where rol = 'MECANICO'       order by id limit 1),
  (select id from tipo_mantenimiento where activo = true         order by id limit 1),
  'PENDIENTE_INSPECCION',
  'Revisión general y cambio de aceite'
);
update vehiculo set estado = 'EN_MANTENIMIENTO' where placa = 'XYZ-789';
