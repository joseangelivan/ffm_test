-- This script creates a hierarchical structure for locations (countries, states, cities)
-- to be used as a catalog in the application.

-- Create Countries Table
CREATE TABLE IF NOT EXISTS countries (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

-- Create States Table
CREATE TABLE IF NOT EXISTS states (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    country_id INT NOT NULL,
    FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE CASCADE,
    UNIQUE(name, country_id)
);

-- Create Cities Table
CREATE TABLE IF NOT EXISTS cities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    state_id INT NOT NULL,
    FOREIGN KEY (state_id) REFERENCES states(id) ON DELETE CASCADE,
    UNIQUE(name, state_id)
);

-- Clear existing data to avoid duplicates on re-execution
TRUNCATE TABLE cities, states, countries RESTART IDENTITY CASCADE;


-- Populate Countries
INSERT INTO countries (name) VALUES
('Argentina'), ('Bolivia'), ('Brazil'), ('Canada'), ('Chile'), ('Colombia'),
('Costa Rica'), ('Cuba'), ('Dominican Republic'), ('Ecuador'), ('El Salvador'),
('Guatemala'), ('Honduras'), ('Mexico'), ('Nicaragua'), ('Panama'), ('Paraguay'),
('Peru'), ('United States'), ('Uruguay'), ('Venezuela');

-- Populate States and Cities

-- Argentina
DO $$
DECLARE
    country_id INT;
BEGIN
    SELECT id INTO country_id FROM countries WHERE name = 'Argentina';

    INSERT INTO states (name, country_id) VALUES
    ('Buenos Aires', country_id), ('Catamarca', country_id), ('Chaco', country_id), ('Chubut', country_id), ('Cordoba', country_id), ('Corrientes', country_id),
    ('Entre Rios', country_id), ('Formosa', country_id), ('Jujuy', country_id), ('La Pampa', country_id), ('La Rioja', country_id), ('Mendoza', country_id),
    ('Misiones', country_id), ('Neuquen', country_id), ('Rio Negro', country_id), ('Salta', country_id), ('San Juan', country_id), ('San Luis', country_id),
    ('Santa Cruz', country_id), ('Santa Fe', country_id), ('Santiago del Estero', country_id), ('Tierra del Fuego', country_id), ('Tucuman', country_id);

    INSERT INTO cities (name, state_id) SELECT 'Buenos Aires', id FROM states WHERE name = 'Buenos Aires' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'La Plata', id FROM states WHERE name = 'Buenos Aires' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Mar del Plata', id FROM states WHERE name = 'Buenos Aires' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'San Fernando del Valle de Catamarca', id FROM states WHERE name = 'Catamarca' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Resistencia', id FROM states WHERE name = 'Chaco' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Rawson', id FROM states WHERE name = 'Chubut' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Cordoba', id FROM states WHERE name = 'Cordoba' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Corrientes', id FROM states WHERE name = 'Corrientes' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Parana', id FROM states WHERE name = 'Entre Rios' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Formosa', id FROM states WHERE name = 'Formosa' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'San Salvador de Jujuy', id FROM states WHERE name = 'Jujuy' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Santa Rosa', id FROM states WHERE name = 'La Pampa' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'La Rioja', id FROM states WHERE name = 'La Rioja' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Mendoza', id FROM states WHERE name = 'Mendoza' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Posadas', id FROM states WHERE name = 'Misiones' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Neuquen', id FROM states WHERE name = 'Neuquen' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Viedma', id FROM states WHERE name = 'Rio Negro' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Salta', id FROM states WHERE name = 'Salta' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'San Juan', id FROM states WHERE name = 'San Juan' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'San Luis', id FROM states WHERE name = 'San Luis' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Rio Gallegos', id FROM states WHERE name = 'Santa Cruz' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Santa Fe', id FROM states WHERE name = 'Santa Fe' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Rosario', id FROM states WHERE name = 'Santa Fe' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Santiago del Estero', id FROM states WHERE name = 'Santiago del Estero' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Ushuaia', id FROM states WHERE name = 'Tierra del Fuego' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'San Miguel de Tucuman', id FROM states WHERE name = 'Tucuman' AND states.country_id = country_id;
END $$;


-- Brazil
DO $$
DECLARE
    country_id INT;
BEGIN
    SELECT id INTO country_id FROM countries WHERE name = 'Brazil';
    INSERT INTO states (name, country_id) VALUES
    ('Acre', country_id), ('Alagoas', country_id), ('Amapa', country_id), ('Amazonas', country_id), ('Bahia', country_id), ('Ceara', country_id),
    ('Distrito Federal', country_id), ('Espirito Santo', country_id), ('Goias', country_id), ('Maranhao', country_id), ('Mato Grosso', country_id),
    ('Mato Grosso do Sul', country_id), ('Minas Gerais', country_id), ('Para', country_id), ('Paraiba', country_id), ('Parana', country_id),
    ('Pernambuco', country_id), ('Piaui', country_id), ('Rio de Janeiro', country_id), ('Rio Grande do Norte', country_id),
    ('Rio Grande do Sul', country_id), ('Rondonia', country_id), ('Roraima', country_id), ('Santa Catarina', country_id), ('Sao Paulo', country_id),
    ('Sergipe', country_id), ('Tocantins', country_id);

    INSERT INTO cities (name, state_id) SELECT 'Rio Branco', id FROM states WHERE name = 'Acre' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Maceio', id FROM states WHERE name = 'Alagoas' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Macapa', id FROM states WHERE name = 'Amapa' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Manaus', id FROM states WHERE name = 'Amazonas' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Salvador', id FROM states WHERE name = 'Bahia' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Fortaleza', id FROM states WHERE name = 'Ceara' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Brasilia', id FROM states WHERE name = 'Distrito Federal' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Vitoria', id FROM states WHERE name = 'Espirito Santo' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Goiania', id FROM states WHERE name = 'Goias' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Sao Luis', id FROM states WHERE name = 'Maranhao' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Cuiaba', id FROM states WHERE name = 'Mato Grosso' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Campo Grande', id FROM states WHERE name = 'Mato Grosso do Sul' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Belo Horizonte', id FROM states WHERE name = 'Minas Gerais' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Belem', id FROM states WHERE name = 'Para' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Joao Pessoa', id FROM states WHERE name = 'Paraiba' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Curitiba', id FROM states WHERE name = 'Parana' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Recife', id FROM states WHERE name = 'Pernambuco' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Teresina', id FROM states WHERE name = 'Piaui' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Rio de Janeiro', id FROM states WHERE name = 'Rio de Janeiro' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Natal', id FROM states WHERE name = 'Rio Grande do Norte' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Porto Alegre', id FROM states WHERE name = 'Rio Grande do Sul' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Porto Velho', id FROM states WHERE name = 'Rondonia' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Boa Vista', id FROM states WHERE name = 'Roraima' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Florianopolis', id FROM states WHERE name = 'Santa Catarina' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Sao Paulo', id FROM states WHERE name = 'Sao Paulo' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Campinas', id FROM states WHERE name = 'Sao Paulo' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Aracaju', id FROM states WHERE name = 'Sergipe' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Palmas', id FROM states WHERE name = 'Tocantins' AND states.country_id = country_id;
END $$;


-- Canada
DO $$
DECLARE
    country_id INT;
BEGIN
    SELECT id INTO country_id FROM countries WHERE name = 'Canada';
    INSERT INTO states (name, country_id) VALUES
    ('Alberta', country_id), ('British Columbia', country_id), ('Manitoba', country_id), ('New Brunswick', country_id), ('Newfoundland and Labrador', country_id),
    ('Nova Scotia', country_id), ('Ontario', country_id), ('Prince Edward Island', country_id), ('Quebec', country_id), ('Saskatchewan', country_id);

    INSERT INTO cities (name, state_id) SELECT 'Edmonton', id FROM states WHERE name = 'Alberta' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Calgary', id FROM states WHERE name = 'Alberta' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Victoria', id FROM states WHERE name = 'British Columbia' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Vancouver', id FROM states WHERE name = 'British Columbia' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Winnipeg', id FROM states WHERE name = 'Manitoba' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Fredericton', id FROM states WHERE name = 'New Brunswick' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'St. John''s', id FROM states WHERE name = 'Newfoundland and Labrador' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Halifax', id FROM states WHERE name = 'Nova Scotia' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Toronto', id FROM states WHERE name = 'Ontario' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Ottawa', id FROM states WHERE name = 'Ontario' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Charlottetown', id FROM states WHERE name = 'Prince Edward Island' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Quebec City', id FROM states WHERE name = 'Quebec' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Montreal', id FROM states WHERE name = 'Quebec' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Regina', id FROM states WHERE name = 'Saskatchewan' AND states.country_id = country_id;
END $$;


-- Mexico
DO $$
DECLARE
    country_id INT;
BEGIN
    SELECT id INTO country_id FROM countries WHERE name = 'Mexico';
    INSERT INTO states (name, country_id) VALUES
    ('Aguascalientes', country_id), ('Baja California', country_id), ('Baja California Sur', country_id), ('Campeche', country_id),
    ('Chiapas', country_id), ('Chihuahua', country_id), ('Coahuila', country_id), ('Colima', country_id), ('Durango', country_id),
    ('Guanajuato', country_id), ('Guerrero', country_id), ('Hidalgo', country_id), ('Jalisco', country_id), ('Mexico City', country_id),
    ('Michoacan', country_id), ('Morelos', country_id), ('Nayarit', country_id), ('Nuevo Leon', country_id), ('Oaxaca', country_id),
    ('Puebla', country_id), ('Queretaro', country_id), ('Quintana Roo', country_id), ('San Luis Potosi', country_id), ('Sinaloa', country_id),
    ('Sonora', country_id), ('Tabasco', country_id), ('Tamaulipas', country_id), ('Tlaxcala', country_id), ('Veracruz', country_id),
    ('Yucatan', country_id), ('Zacatecas', country_id);

    INSERT INTO cities (name, state_id) SELECT 'Aguascalientes', id FROM states WHERE name = 'Aguascalientes' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Mexicali', id FROM states WHERE name = 'Baja California' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Tijuana', id FROM states WHERE name = 'Baja California' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'La Paz', id FROM states WHERE name = 'Baja California Sur' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Campeche', id FROM states WHERE name = 'Campeche' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Tuxtla Gutierrez', id FROM states WHERE name = 'Chiapas' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Chihuahua', id FROM states WHERE name = 'Chihuahua' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Saltillo', id FROM states WHERE name = 'Coahuila' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Colima', id FROM states WHERE name = 'Colima' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Durango', id FROM states WHERE name = 'Durango' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Guanajuato', id FROM states WHERE name = 'Guanajuato' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Chilpancingo', id FROM states WHERE name = 'Guerrero' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Pachuca', id FROM states WHERE name = 'Hidalgo' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Guadalajara', id FROM states WHERE name = 'Jalisco' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Mexico City', id FROM states WHERE name = 'Mexico City' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Morelia', id FROM states WHERE name = 'Michoacan' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Cuernavaca', id FROM states WHERE name = 'Morelos' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Tepic', id FROM states WHERE name = 'Nayarit' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Monterrey', id FROM states WHERE name = 'Nuevo Leon' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Oaxaca', id FROM states WHERE name = 'Oaxaca' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Puebla', id FROM states WHERE name = 'Puebla' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Queretaro', id FROM states WHERE name = 'Queretaro' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Chetumal', id FROM states WHERE name = 'Quintana Roo' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Cancun', id FROM states WHERE name = 'Quintana Roo' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'San Luis Potosi', id FROM states WHERE name = 'San Luis Potosi' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Culiacan', id FROM states WHERE name = 'Sinaloa' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Hermosillo', id FROM states WHERE name = 'Sonora' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Villahermosa', id FROM states WHERE name = 'Tabasco' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Ciudad Victoria', id FROM states WHERE name = 'Tamaulipas' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Tlaxcala', id FROM states WHERE name = 'Tlaxcala' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Xalapa', id FROM states WHERE name = 'Veracruz' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Merida', id FROM states WHERE name = 'Yucatan' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Zacatecas', id FROM states WHERE name = 'Zacatecas' AND states.country_id = country_id;
END $$;


-- United States
DO $$
DECLARE
    country_id INT;
BEGIN
    SELECT id INTO country_id FROM countries WHERE name = 'United States';
    INSERT INTO states (name, country_id) VALUES
    ('Alabama', country_id), ('Alaska', country_id), ('Arizona', country_id), ('Arkansas', country_id), ('California', country_id),
    ('Colorado', country_id), ('Connecticut', country_id), ('Delaware', country_id), ('Florida', country_id), ('Georgia', country_id),
    ('Hawaii', country_id), ('Idaho', country_id), ('Illinois', country_id), ('Indiana', country_id), ('Iowa', country_id),
    ('Kansas', country_id), ('Kentucky', country_id), ('Louisiana', country_id), ('Maine', country_id), ('Maryland', country_id),
    ('Massachusetts', country_id), ('Michigan', country_id), ('Minnesota', country_id), ('Mississippi', country_id), ('Missouri', country_id),
    ('Montana', country_id), ('Nebraska', country_id), ('Nevada', country_id), ('New Hampshire', country_id), ('New Jersey', country_id),
    ('New Mexico', country_id), ('New York', country_id), ('North Carolina', country_id), ('North Dakota', country_id), ('Ohio', country_id),
    ('Oklahoma', country_id), ('Oregon', country_id), ('Pennsylvania', country_id), ('Rhode Island', country_id), ('South Carolina', country_id),
    ('South Dakota', country_id), ('Tennessee', country_id), ('Texas', country_id), ('Utah', country_id), ('Vermont', country_id),
    ('Virginia', country_id), ('Washington', country_id), ('West Virginia', country_id), ('Wisconsin', country_id), ('Wyoming', country_id);

    INSERT INTO cities (name, state_id) SELECT 'Sacramento', id FROM states WHERE name = 'California' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Los Angeles', id FROM states WHERE name = 'California' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'San Francisco', id FROM states WHERE name = 'California' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Tallahassee', id FROM states WHERE name = 'Florida' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Miami', id FROM states WHERE name = 'Florida' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Orlando', id FROM states WHERE name = 'Florida' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Albany', id FROM states WHERE name = 'New York' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'New York City', id FROM states WHERE name = 'New York' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Austin', id FROM states WHERE name = 'Texas' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Houston', id FROM states WHERE name = 'Texas' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Dallas', id FROM states WHERE name = 'Texas' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Chicago', id FROM states WHERE name = 'Illinois' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Springfield', id FROM states WHERE name = 'Illinois' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Phoenix', id FROM states WHERE name = 'Arizona' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Philadelphia', id FROM states WHERE name = 'Pennsylvania' AND states.country_id = country_id;
    INSERT INTO cities (name, state_id) SELECT 'Harrisburg', id FROM states WHERE name = 'Pennsylvania' AND states.country_id = country_id;
END $$;
