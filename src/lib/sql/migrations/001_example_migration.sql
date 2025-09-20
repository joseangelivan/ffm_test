-- Este es un archivo de migración de ejemplo.
-- Puedes usarlo para hacer cambios incrementales en tu base de datos,
-- como añadir columnas, alterar tipos de datos, o crear nuevas tablas de forma segura.
-- El sistema de inicialización ejecutará este archivo una sola vez.

-- Ejemplo de un cambio no destructivo:
-- ALTER TABLE residents ADD COLUMN IF NOT EXISTS document_number VARCHAR(255);

-- Por ahora, este archivo no hará cambios reales.
SELECT 'Ejemplo de migración ejecutada';
