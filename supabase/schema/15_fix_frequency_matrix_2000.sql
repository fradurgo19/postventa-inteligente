-- Corregir matriz de frecuencias (regla 2000 h): aplica en 2000, 4000, 6000, 8000
-- Alineado a la matriz de negocio HORAS DE LA MÁQUINA × FRECUENCIA

UPDATE maintenance_frequency_matrix
SET
  frecuencia_250 = TRUE,
  frecuencia_1000 = (horometro >= 1000 AND horometro % 1000 = 0),
  frecuencia_2000 = (horometro >= 2000 AND horometro % 2000 = 0),
  frecuencia_4000 = (horometro >= 4000 AND horometro % 4000 = 0),
  frecuencia_5000 = (horometro >= 5000 AND horometro % 5000 = 0);

-- Re-sembrar filas faltantes si el rango no estaba completo
INSERT INTO maintenance_frequency_matrix (
  horometro, frecuencia_250, frecuencia_1000, frecuencia_2000, frecuencia_4000, frecuencia_5000
)
SELECT
  h,
  TRUE,
  (h >= 1000 AND h % 1000 = 0),
  (h >= 2000 AND h % 2000 = 0),
  (h >= 4000 AND h % 4000 = 0),
  (h >= 5000 AND h % 5000 = 0)
FROM generate_series(250, 9000, 250) AS h
ON CONFLICT (horometro) DO UPDATE SET
  frecuencia_250 = EXCLUDED.frecuencia_250,
  frecuencia_1000 = EXCLUDED.frecuencia_1000,
  frecuencia_2000 = EXCLUDED.frecuencia_2000,
  frecuencia_4000 = EXCLUDED.frecuencia_4000,
  frecuencia_5000 = EXCLUDED.frecuencia_5000;
