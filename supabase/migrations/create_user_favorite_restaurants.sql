-- =========================================
-- SISTEMA DE RESTAURANTES FAVORITOS
-- =========================================

-- Criar tabela de restaurantes favoritos
CREATE TABLE IF NOT EXISTS user_favorite_restaurants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    restaurant_id TEXT NOT NULL, -- ID do restaurante do Google Places
    restaurant_name TEXT NOT NULL,
    restaurant_address TEXT,
    restaurant_photo_url TEXT,
    restaurant_rating DECIMAL(2,1),
    restaurant_place_id TEXT, -- Place ID do Google para buscar detalhes
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id, restaurant_id), -- Um usuário não pode favoritar o mesmo restaurante duas vezes
    
    -- Índices para performance
    INDEX idx_user_favorite_restaurants_user_id ON user_favorite_restaurants(user_id),
    INDEX idx_user_favorite_restaurants_restaurant_id ON user_favorite_restaurants(restaurant_id),
    INDEX idx_user_favorite_restaurants_created_at ON user_favorite_restaurants(created_at DESC)
);

-- RLS (Row Level Security)
ALTER TABLE user_favorite_restaurants ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuários podem ver apenas seus próprios favoritos"
    ON user_favorite_restaurants FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar apenas seus próprios favoritos"
    ON user_favorite_restaurants FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar apenas seus próprios favoritos"
    ON user_favorite_restaurants FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar apenas seus próprios favoritos"
    ON user_favorite_restaurants FOR DELETE
    USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_favorite_restaurants_updated_at 
    BEFORE UPDATE ON user_favorite_restaurants 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Comentários para documentação
COMMENT ON TABLE user_favorite_restaurants IS 'Tabela para armazenar restaurantes favoritos dos usuários';
COMMENT ON COLUMN user_favorite_restaurants.user_id IS 'ID do usuário que favoritou o restaurante';
COMMENT ON COLUMN user_favorite_restaurants.restaurant_id IS 'ID único do restaurante (do Google Places)';
COMMENT ON COLUMN user_favorite_restaurants.restaurant_place_id IS 'Place ID do Google para buscar detalhes atualizados';

-- Inserir alguns dados de exemplo (opcional - remover em produção)
-- INSERT INTO user_favorite_restaurants (user_id, restaurant_id, restaurant_name, restaurant_address) 
-- VALUES 
--   ('user-example-id', 'rest-1', 'Restaurante Exemplo', 'Rua Exemplo, 123');

COMMIT;