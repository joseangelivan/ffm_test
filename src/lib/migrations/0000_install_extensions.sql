-- Instala las extensiones necesarias de PostgreSQL si no están presentes.
-- Es importante que las extensiones se instalen en un script separado
-- ya que CREATE EXTENSION no puede ejecutarse dentro de un bloque de transacción
-- explícito en algunas versiones/configuraciones de PostgreSQL.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;
