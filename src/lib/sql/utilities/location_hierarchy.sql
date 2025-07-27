-- This script is for creating tables that hold utility data, like location hierarchies.
-- It's intended to be run once or used as a reference for database setup.
-- It is NOT part of the automatic migration process in auth.ts.

CREATE TABLE IF NOT EXISTS countries (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS states (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    country_id INTEGER NOT NULL,
    FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE CASCADE,
    UNIQUE(name, country_id)
);

CREATE TABLE IF NOT EXISTS cities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    state_id INTEGER NOT NULL,
    FOREIGN KEY (state_id) REFERENCES states(id) ON DELETE CASCADE,
    UNIQUE(name, state_id)
);

-- Sample Data
-- Inserting countries
INSERT INTO countries (name) VALUES ('Brasil'), ('México'), ('Argentina') ON CONFLICT (name) DO NOTHING;

-- Inserting states for Brasil
INSERT INTO states (name, country_id) VALUES
('São Paulo', (SELECT id from countries WHERE name = 'Brasil')),
('Rio de Janeiro', (SELECT id from countries WHERE name = 'Brasil')),
('Minas Gerais', (SELECT id from countries WHERE name = 'Brasil'))
ON CONFLICT (name, country_id) DO NOTHING;

-- Inserting states for México
INSERT INTO states (name, country_id) VALUES
('Ciudad de México', (SELECT id from countries WHERE name = 'México')),
('Jalisco', (SELECT id from countries WHERE name = 'México')),
('Nuevo León', (SELECT id from countries WHERE name = 'México'))
ON CONFLICT (name, country_id) DO NOTHING;

-- Inserting states for Argentina
INSERT INTO states (name, country_id) VALUES
('Buenos Aires', (SELECT id from countries WHERE name = 'Argentina')),
('Córdoba', (SELECT id from countries WHERE name = 'Argentina')),
('Santa Fe', (SELECT id from countries WHERE name = 'Argentina'))
ON CONFLICT (name, country_id) DO NOTHING;

-- Inserting cities for São Paulo
INSERT INTO cities (name, state_id) VALUES
('São Paulo', (SELECT id from states WHERE name = 'São Paulo' AND country_id = (SELECT id from countries WHERE name = 'Brasil'))),
('Campinas', (SELECT id from states WHERE name = 'São Paulo' AND country_id = (SELECT id from countries WHERE name = 'Brasil'))),
('Guarulhos', (SELECT id from states WHERE name = 'São Paulo' AND country_id = (SELECT id from countries WHERE name = 'Brasil')))
ON CONFLICT (name, state_id) DO NOTHING;

-- Inserting cities for Rio de Janeiro
INSERT INTO cities (name, state_id) VALUES
('Rio de Janeiro', (SELECT id from states WHERE name = 'Rio de Janeiro' AND country_id = (SELECT id from countries WHERE name = 'Brasil'))),
('Niterói', (SELECT id from states WHERE name = 'Rio de Janeiro' AND country_id = (SELECT id from countries WHERE name = 'Brasil'))),
('São Gonçalo', (SELECT id from states WHERE name = 'Rio de Janeiro' AND country_id = (SELECT id from countries WHERE name = 'Brasil')))
ON CONFLICT (name, state_id) DO NOTHING;

-- Inserting cities for Ciudad de México
INSERT INTO cities (name, state_id) VALUES
('Ciudad de México', (SELECT id from states WHERE name = 'Ciudad de México' AND country_id = (SELECT id from countries WHERE name = 'México')))
ON CONFLICT (name, state_id) DO NOTHING;
