-- ========================================
-- MIGRAÇÃO: Adicionar campos do Instagram aos perfis
-- ========================================

-- Adicionar colunas para dados do Instagram na tabela profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS instagram_token TEXT,
ADD COLUMN IF NOT EXISTS instagram_user_id TEXT,
ADD COLUMN IF NOT EXISTS instagram_username TEXT,
ADD COLUMN IF NOT EXISTS instagram_connected_at TIMESTAMPTZ;

-- Adicionar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_profiles_instagram_user_id 
ON profiles(instagram_user_id) 
WHERE instagram_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_instagram_username 
ON profiles(instagram_username) 
WHERE instagram_username IS NOT NULL;

-- Adicionar comentários para documentação
COMMENT ON COLUMN profiles.instagram_token IS 'Token de acesso OAuth do Instagram para API calls';
COMMENT ON COLUMN profiles.instagram_user_id IS 'ID único do usuário no Instagram';
COMMENT ON COLUMN profiles.instagram_username IS 'Username do Instagram (@username)';
COMMENT ON COLUMN profiles.instagram_connected_at IS 'Data e hora da última conexão com Instagram';

-- Verificar se as colunas foram criadas
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name LIKE 'instagram_%'
ORDER BY column_name;