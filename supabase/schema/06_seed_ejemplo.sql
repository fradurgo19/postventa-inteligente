-- ═══════════════════════════════════════════════════════════════════════════════
-- DATOS DE EJEMPLO (opcional) — Tempario Case SR175B
-- Ejecutar después de 01_calculadora.sql
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO temparios_mantenimiento (
  legacy_id, marca, linea, modelo, tipo_item, item, unidad_medida, cantidad,
  frecuencia_horas, referencia_genuina, referencia_fleetguard, referencia_donaldson,
  tiempo_horas, procedimiento, avisos_claves, precio_unitario, created_by, updated_by
) VALUES
  (11451, 'Case', 'Minicargador', 'SR175B', 'Repuesto', 'Filtro aceite motor', 'Unidad', 1,
   250, '84475542', 'LF16011', 'P551132', 0, 'N/A', 'N/A', 85000,
   'SOPORTE AL PRODUCTO PARTEQUIPOS', 'SOPORTE AL PRODUCTO PARTEQUIPOS'),
  (11452, 'Case', 'Minicagador', 'SR175B', 'Consumible', 'Aceite Motor 15W-40', 'L', 8,
   250, NULL, NULL, NULL, 0, NULL, NULL, 18500,
   'SOPORTE AL PRODUCTO PARTEQUIPOS', 'SOPORTE AL PRODUCTO PARTEQUIPOS'),
  (11453, 'Case', 'Minicargador', 'SR175B', 'Actividad', 'Cambio aceite y filtros', 'Servicio', 1,
   250, NULL, NULL, NULL, 2.5, 'Drenar, reemplazar filtros, rellenar según OEM', 'Verificar torque',
   0, 'SOPORTE AL PRODUCTO PARTEQUIPOS', 'SOPORTE AL PRODUCTO PARTEQUIPOS')
ON CONFLICT DO NOTHING;

INSERT INTO cpp_catalogo (
  legacy_no, ref_sap, marca, nombre, cantidad, frecuencia, medida, comentario,
  modelo, parte, tipo, recomendacion, equivalencia1, equivalencia2, equivalencia3,
  referencia_catalogo_original, precio_lista, stock_disponible, bodega, created_by
) VALUES (
  2, '898375860-0', 'HITACHI', 'FILTRO ACEITE MOTOR N°1 / ENGINE OIL FILTER', 1,
  '250 hrs', '0', 'N/A', 'ZX330-6', 'MTTO PREVENTIVO', 'FILTRACION',
  'Reemplazar cada 250 horas', 'P550596', 'LF16045', '898375860-0', '8983758600',
  145000, 12, 'Bogotá', 'SOPORTE AL PRODUCTO PARTEQUIPOS'
)
ON CONFLICT DO NOTHING;

INSERT INTO tarifas_desplazamiento (nombre, costo_por_km, costo_por_hora_viaje, factor_ida_vuelta, iva_porcentaje)
VALUES ('Tarifa Estándar Colombia', 3500, 142500, 2, 19)
ON CONFLICT DO NOTHING;
