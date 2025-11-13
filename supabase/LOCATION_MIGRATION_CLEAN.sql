-- ========================================
-- MIGRAÇÃO LIMPA: Campos de Localização
-- ========================================

-- 1. Adicionar colunas de localização
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS current_latitude DOUBLE PRECISION;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS current_longitude DOUBLE PRECISION;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS location_accuracy DOUBLE PRECISION;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS current_address TEXT;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS current_city TEXT;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS current_country TEXT;

-- 2. Criar índices
CREATE INDEX idx_profiles_location 
ON profiles(current_latitude, current_longitude) 
WHERE current_latitude IS NOT NULL AND current_longitude IS NOT NULL;

CREATE INDEX idx_profiles_city 
ON profiles(current_city) 
WHERE current_city IS NOT NULL;

-- 3. Função para calcular distância
CREATE OR REPLACE FUNCTION calculate_distance(
    lat1 DOUBLE PRECISION,
    lon1 DOUBLE PRECISION,
    lat2 DOUBLE PRECISION,
    lon2 DOUBLE PRECISION
) RETURNS DOUBLE PRECISION AS $$
BEGIN
    RETURN (
        6371 * acos(
            cos(radians(lat1)) * cos(radians(lat2)) * cos(radians(lon2) - radians(lon1)) +
            sin(radians(lat1)) * sin(radians(lat2))
        )
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 4. Remover políticas existentes (sem erro se não existirem)
DROP POLICY IF EXISTS "Users can view own location" ON profiles;
DROP POLICY IF EXISTS "Users can update own location" ON profiles;

-- 5. Criar novas políticas (SEM IF NOT EXISTS)
CREATE POLICY "Users can view own location" ON profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own location" ON profiles
FOR UPDATE USING (auth.uid() = id);

-- 6. Verificar se funcionou
SELECT 
    column_name, 
    data_type
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name LIKE 'current_%';