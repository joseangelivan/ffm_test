-- Create the protocols table
CREATE TABLE IF NOT EXISTS protocols (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    features_translations JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create a trigger to automatically update the updated_at timestamp
CREATE TRIGGER set_protocols_timestamp
BEFORE UPDATE ON protocols
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- Seed initial protocols
INSERT INTO protocols (name, features_translations) VALUES
('Websocket', '{"es": "Protocolo de comunicación bidireccional y full-duplex sobre un único socket TCP. Ideal para aplicaciones en tiempo real.", "pt-BR": "Protocolo de comunicação bidirecional e full-duplex sobre um único soquete TCP. Ideal para aplicações em tempo real."}'),
('MQTT', '{"es": "Protocolo de mensajería ligero de publicación/suscripción. Diseñado para conexiones con poco ancho de banda y alta latencia, común en IoT.", "pt-BR": "Protocolo de mensagens leve de publicação/assinatura. Projetado para conexões com baixa largura de banda e alta latência, comum em IoT."}'),
('CoAP', '{"es": "Protocolo web especializado para dispositivos y redes con recursos restringidos. Similar a HTTP pero mucho más ligero.", "pt-BR": "Protocolo web especializado para dispositivos e redes com recursos restritos. Semelhante ao HTTP, mas muito mais leve."}'),
('HTTP', '{"es": "Protocolo de transferencia de hipertexto. Un protocolo estándar de solicitud-respuesta para la comunicación cliente-servidor.", "pt-BR": "Protocolo de transferência de hipertexto. Um protocolo padrão de solicitação-resposta para a comunicação cliente-servidor."}')
ON CONFLICT (name) DO NOTHING;

    