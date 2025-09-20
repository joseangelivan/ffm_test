-- Seed data for protocols table
INSERT INTO protocols (name, features_translations) VALUES
('gt06', '{"es": "Protocolo para rastreadores GPS GT06 y compatibles.", "pt-BR": "Protocolo para rastreadores GPS GT06 e compatíveis."}'),
('osmand', '{"es": "Protocolo para la aplicación de seguimiento OsmAnd.", "pt-BR": "Protocolo para o aplicativo de rastreamento OsmAnd."}'),
('traccar', '{"es": "Protocolo cliente de Traccar.", "pt-BR": "Protocolo cliente do Traccar."}')
ON CONFLICT (name) DO NOTHING;
