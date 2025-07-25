-- Este es el esquema base de la base de datos
CREATE TABLE Condominios (
    id_condominio SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    direccion TEXT,
    mapa_personalizado_url TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Usuarios (
    id_usuario SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    contrasena_hash VARCHAR(255) NOT NULL,
    tipo_usuario VARCHAR(50) NOT NULL, -- 'Residente', 'Porteria'
    id_condominio INT REFERENCES Condominios(id_condominio),
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Dispositivos (
    id_dispositivo SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    tipo_dispositivo VARCHAR(50),
    id_usuario INT REFERENCES Usuarios(id_usuario),
    id_condominio INT REFERENCES Condominios(id_condominio),
    token_autenticacion VARCHAR(255) UNIQUE,
    fecha_asociacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Geocercas (
    id_geocerca SERIAL PRIMARY KEY,
    id_condominio INT REFERENCES Condominios(id_condominio),
    nombre VARCHAR(255) NOT NULL,
    definicion_geometrica JSONB, -- Para almacenar polígonos, círculos, etc.
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ElementosMapa (
    id_elemento SERIAL PRIMARY KEY,
    id_condominio INT REFERENCES Condominios(id_condominio),
    nombre VARCHAR(255),
    tipo_elemento VARCHAR(50),
    coordenadas_o_definicion JSONB, -- Puede ser un punto, o una forma
    metadata JSONB, -- Información adicional, como el icono a usar
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
