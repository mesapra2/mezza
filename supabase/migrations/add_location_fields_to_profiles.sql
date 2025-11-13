-- ========================================
-- MIGRAÇÃO: Adicionar campos de localização aos perfis
-- ========================================

-- Adicionar colunas de localização na tabela profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS current_latitude DECIMAL(10,8),
ADD COLUMN IF NOT EXISTS current_longitude DECIMAL(11,8),
ADD COLUMN IF NOT EXISTS location_accuracy DECIMAL(8,2),
ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS current_address TEXT,
ADD COLUMN IF NOT EXISTS current_city VARCHAR(100),
ADD COLUMN IF NOT EXISTS current_country VARCHAR(100);

-- Adicionar índices para busca geográfica
CREATE INDEX IF NOT EXISTS idx_profiles_location 
ON profiles(current_latitude, current_longitude) 
WHERE current_latitude IS NOT NULL AND current_longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_location_updated_at 
ON profiles(location_updated_at) 
WHERE location_updated_at IS NOT NULL;

-- Verificar se as colunas de localização dos restaurantes existem na tabela events
-- Se não existirem, criar (assumindo que eventos têm localização do restaurante)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'restaurant_latitude') THEN
        ALTER TABLE events ADD COLUMN restaurant_latitude DECIMAL(10,8);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'restaurant_longitude') THEN
        ALTER TABLE events ADD COLUMN restaurant_longitude DECIMAL(11,8);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'restaurant_address') THEN
        ALTER TABLE events ADD COLUMN restaurant_address TEXT;
    END IF;
END $$;

-- Adicionar índices na tabela events para busca geográfica
CREATE INDEX IF NOT EXISTS idx_events_restaurant_location 
ON events(restaurant_latitude, restaurant_longitude) 
WHERE restaurant_latitude IS NOT NULL AND restaurant_longitude IS NOT NULL;

-- Função para calcular distância entre dois pontos (Haversine formula)
CREATE OR REPLACE FUNCTION calculate_distance(
    lat1 DECIMAL(10,8), 
    lon1 DECIMAL(11,8), 
    lat2 DECIMAL(10,8), 
    lon2 DECIMAL(11,8)
) RETURNS DECIMAL(10,3) AS $$
DECLARE
    r DECIMAL := 6371; -- Raio da Terra em km
    dlat DECIMAL;
    dlon DECIMAL;
    a DECIMAL;
    c DECIMAL;
    distance DECIMAL;
BEGIN
    -- Converter graus para radianos
    dlat := radians(lat2 - lat1);
    dlon := radians(lon2 - lon1);
    
    -- Aplicar fórmula de Haversine
    a := sin(dlat/2) * sin(dlat/2) + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2) * sin(dlon/2);
    c := 2 * atan2(sqrt(a), sqrt(1-a));
    distance := r * c;
    
    RETURN distance;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Função para buscar eventos próximos
CREATE OR REPLACE FUNCTION find_nearby_events(
    user_lat DECIMAL(10,8),
    user_lon DECIMAL(11,8),
    max_distance_km DECIMAL(6,2) DEFAULT 10,
    limit_count INTEGER DEFAULT 50
) RETURNS TABLE(
    id UUID,
    title TEXT,
    description TEXT,
    event_date TIMESTAMPTZ,
    event_time TIME,
    max_participants INTEGER,
    current_participants INTEGER,
    restaurant_name TEXT,
    restaurant_latitude DECIMAL(10,8),
    restaurant_longitude DECIMAL(11,8),
    restaurant_address TEXT,
    distance_km DECIMAL(10,3),
    creator_id UUID,
    status TEXT,
    created_at TIMESTAMPTZ,
    event_type TEXT,
    hashtags TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.title,
        e.description,
        e.event_date,
        e.event_time,
        e.max_participants,
        e.current_participants,
        e.restaurant_name,
        e.restaurant_latitude,
        e.restaurant_longitude,
        e.restaurant_address,
        calculate_distance(user_lat, user_lon, e.restaurant_latitude, e.restaurant_longitude) as distance_km,
        e.creator_id,
        e.status,
        e.created_at,
        e.event_type,
        e.hashtags
    FROM events e
    WHERE 
        e.restaurant_latitude IS NOT NULL 
        AND e.restaurant_longitude IS NOT NULL
        AND e.status IN ('open', 'active') -- Apenas eventos ativos
        AND e.event_date >= CURRENT_DATE -- Apenas eventos futuros
        AND calculate_distance(user_lat, user_lon, e.restaurant_latitude, e.restaurant_longitude) <= max_distance_km
    ORDER BY 
        distance_km ASC,
        e.event_date ASC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Função para atualizar estatísticas de localização
CREATE OR REPLACE FUNCTION update_location_stats() RETURNS TRIGGER AS $$
BEGIN
    -- Atualizar timestamp de última modificação
    NEW.location_updated_at := NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar automaticamente location_updated_at
DROP TRIGGER IF EXISTS trigger_update_location_stats ON profiles;
CREATE TRIGGER trigger_update_location_stats
    BEFORE UPDATE OF current_latitude, current_longitude
    ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_location_stats();

-- RLS (Row Level Security) para proteger dados de localização
-- Usuários só podem ver sua própria localização
CREATE POLICY IF NOT EXISTS "Users can view own location" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "Users can update own location" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Comentários para documentação
COMMENT ON COLUMN profiles.current_latitude IS 'Latitude atual do usuário (atualizada automaticamente)';
COMMENT ON COLUMN profiles.current_longitude IS 'Longitude atual do usuário (atualizada automaticamente)';
COMMENT ON COLUMN profiles.location_accuracy IS 'Precisão da localização em metros';
COMMENT ON COLUMN profiles.location_updated_at IS 'Timestamp da última atualização de localização';
COMMENT ON COLUMN profiles.current_address IS 'Endereço legível da localização atual';
COMMENT ON COLUMN profiles.current_city IS 'Cidade atual do usuário';
COMMENT ON COLUMN profiles.current_country IS 'País atual do usuário';

COMMENT ON FUNCTION calculate_distance(DECIMAL, DECIMAL, DECIMAL, DECIMAL) IS 'Calcula distância em km entre duas coordenadas usando fórmula de Haversine';
COMMENT ON FUNCTION find_nearby_events(DECIMAL, DECIMAL, DECIMAL, INTEGER) IS 'Busca eventos próximos dentro do raio especificado, ordenados por distância';

-- Log da migração
INSERT INTO public.migrations_log (migration_name, applied_at, description)
VALUES (
    'add_location_fields_to_profiles',
    NOW(),
    'Adicionados campos de localização, índices geográficos, e funções para busca por proximidade'
) ON CONFLICT (migration_name) DO NOTHING;