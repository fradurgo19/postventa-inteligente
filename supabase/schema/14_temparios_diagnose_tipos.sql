-- Diagnóstico rápido (SQL Editor): tipos y frecuencias por marca/modelo
-- Ajusta marca/modelo de ejemplo según tus filtros en la calculadora

-- 1) Distribución de tipo_item
SELECT tipo_item, COUNT(*) AS total
FROM temparios_mantenimiento
GROUP BY tipo_item
ORDER BY total DESC;

-- 2) ¿Hay Actividad / Fluido?
SELECT COUNT(*) FILTER (WHERE tipo_item ILIKE 'actividad%') AS actividades,
       COUNT(*) FILTER (WHERE tipo_item ILIKE 'fluido%' OR tipo_item ILIKE 'consum%') AS consumibles,
       COUNT(*) FILTER (WHERE tipo_item ILIKE 'repues%') AS repuestos,
       COUNT(*) AS total
FROM temparios_mantenimiento;

-- 3) Frecuencias distintas
SELECT frecuencia_horas, COUNT(*) AS total
FROM temparios_mantenimiento
GROUP BY frecuencia_horas
ORDER BY frecuencia_horas;
