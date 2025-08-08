-- Tabla para almacenar las geocercas de cada condominio
CREATE TABLE IF NOT EXISTS geofences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    geometry JSONB NOT NULL, -- Almacena el polígono, círculo o rectángulo
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Asegurarse de que solo haya una geocerca por defecto por condominio
CREATE UNIQUE INDEX IF NOT EXISTS one_default_geofence_per_condo_idx ON geofences (condominium_id) WHERE is_default;


-- Tabla para los tipos de elementos que se pueden colocar en el mapa
CREATE TABLE IF NOT EXISTS map_element_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    icon_svg TEXT, -- Puede ser un SVG inline, un enlace a una imagen o una clave de un set de íconos
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(condominium_id, name)
);

-- Tabla para las instancias de los elementos en el mapa
CREATE TABLE IF NOT EXISTS map_elements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
    type_id UUID NOT NULL REFERENCES map_element_types(id) ON DELETE CASCADE,
    name VARCHAR(255),
    location GEOMETRY(Point, 4326), -- Almacena la ubicación del punto
    metadata JSONB, -- Para cualquier dato extra, como la dirección de una cámara
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
