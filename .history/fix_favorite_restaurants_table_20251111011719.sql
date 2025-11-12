-- =========================================
-- CORREÇÃO: SISTEMA DE RESTAURANTES FAVORITOS
-- =========================================
-- Execute este script no Supabase SQL Editor

-- Remover tabela se existir com problemas
DROP TABLE IF EXISTS user_favorite_restaurants CASCADE;

-- Recriar tabela corretamente
CREATE TABLE user_favorite_restaurants (
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
    UNIQUE(user_id, restaurant_id) -- Um usuário não pode favoritar o mesmo restaurante duas vezes
);

-- Criar índices separadamente (sintaxe correta)
CREATE INDEX idx_user_favorite_restaurants_user_id ON user_favorite_restaurants(user_id);
CREATE INDEX idx_user_favorite_restaurants_restaurant_id ON user_favorite_restaurants(restaurant_id);
CREATE INDEX idx_user_favorite_restaurants_created_at ON user_favorite_restaurants(created_at DESC);

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

-- Função para updated_at
CREATE OR REPLACE FUNCTION update_favorite_restaurants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para updated_at
CREATE TRIGGER update_user_favorite_restaurants_updated_at 
    BEFORE UPDATE ON user_favorite_restaurants 
    FOR EACH ROW 
    EXECUTE FUNCTION update_favorite_restaurants_updated_at();

-- Comentários para documentação
COMMENT ON TABLE user_favorite_restaurants IS 'Tabela para armazenar restaurantes favoritos dos usuários';
COMMENT ON COLUMN user_favorite_restaurants.user_id IS 'ID do usuário que favoritou o restaurante';
COMMENT ON COLUMN user_favorite_restaurants.restaurant_id IS 'ID único do restaurante (do Google Places)';
COMMENT ON COLUMN user_favorite_restaurants.restaurant_place_id IS 'Place ID do Google para buscar detalhes atualizados';

-- Verificação final
DO $$
BEGIN
    RAISE NOTICE '✅ Tabela user_favorite_restaurants criada com sucesso!';
    RAISE NOTICE '📋 Políticas RLS configuradas';
    RAISE NOTICE '🔧 Triggers para updated_at criados';
    RAISE NOTICE '📈 Índices para performance criados';
    RAISE NOTICE '🎯 Sistema de favoritos pronto para uso!';
END $$;