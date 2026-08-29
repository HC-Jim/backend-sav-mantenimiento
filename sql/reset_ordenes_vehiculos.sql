-- ============================================================
--  REINICIAR órdenes de mantenimiento + vehículos y sembrar 10 vehículos
--  Ejecutar en Supabase -> SQL Editor.
--
--  ⚠️ DESTRUCTIVO: al vaciar "vehiculo" (con CASCADE) también se borran los
--     datos que dependen de un vehículo: reservas, cotizaciones, seguros,
--     alquileres, pagos/comprobantes y TODAS las órdenes de mantenimiento y
--     sus detalles. NO se tocan usuarios, clientes ni el catálogo de repuestos.
-- ============================================================

-- 1) Vaciar y reiniciar ids. CASCADE borra todo lo que referencia a estas tablas.
truncate table vehiculo, orden_mantenimiento restart identity cascade;

-- 2) Sembrar 10 vehículos con datos variados.
--    Regla: precio_regular >= precio_normal (constraint chk_vehiculo_precio).
insert into vehiculo
  (sku, placa, marca, modelo, anio, color, categoria,
   precio_regular, precio_normal, precio_campania, dias_min_campania,
   kilometraje, fecha_proximo_mantenimiento, estado)
values
  ('VH-0001', 'ABC-123', 'Toyota',        'Yaris',    2021, 'Blanco', 'Economico', 120, 100,  90, 7, 25000, '2026-10-15', 'DISPONIBLE'),
  ('VH-0002', 'XYZ-789', 'Kia',           'Rio',      2020, 'Gris',   'Economico', 130, 110,  95, 7, 40000, '2026-09-30', 'DISPONIBLE'),
  ('VH-0003', 'DEF-456', 'Hyundai',       'Accent',   2022, 'Rojo',   'Sedan',     160, 140, 120, 7, 18000, '2026-11-10', 'DISPONIBLE'),
  ('VH-0004', 'GHI-234', 'Toyota',        'Corolla',  2021, 'Negro',  'Sedan',     180, 150, 135, 7, 32000, '2026-10-05', 'DISPONIBLE'),
  ('VH-0005', 'JKL-567', 'Nissan',        'Sentra',   2019, 'Plata',  'Sedan',     170, 145, 130, 7, 55000, '2026-09-20', 'DISPONIBLE'),
  ('VH-0006', 'MNO-890', 'Hyundai',       'Tucson',   2022, 'Azul',   'SUV',       250, 220, 200, 5, 15000, '2026-12-01', 'DISPONIBLE'),
  ('VH-0007', 'PQR-345', 'Kia',           'Sportage', 2021, 'Blanco', 'SUV',       260, 230, 210, 5, 27000, '2026-10-25', 'DISPONIBLE'),
  ('VH-0008', 'STU-678', 'Toyota',        'RAV4',     2023, 'Gris',   'SUV',       300, 270, 250, 5,  8000, '2027-01-15', 'DISPONIBLE'),
  ('VH-0009', 'VWX-901', 'Mercedes-Benz', 'C200',     2022, 'Negro',  'Premium',   450, 400, 370, 3, 12000, '2026-11-20', 'DISPONIBLE'),
  ('VH-0010', 'YZA-135', 'BMW',           'X5',       2023, 'Blanco', 'Premium',   600, 550, 500, 3,  6000, '2027-02-10', 'DISPONIBLE');
