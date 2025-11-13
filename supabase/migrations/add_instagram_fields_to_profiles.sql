-- Adicionar campos do Instagram à tabela profiles
DO $$ 
BEGIN 
    -- Instagram Token
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'instagram_token'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN instagram_token TEXT;
    END IF;
    
    -- Instagram User ID
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'instagram_user_id'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN instagram_user_id TEXT;
    END IF;
    
    -- Instagram Username
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'instagram_username'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN instagram_username TEXT;
    END IF;
    
    -- Data de conexão
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'instagram_connected_at'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN instagram_connected_at TIMESTAMPTZ;
    END IF;
END $$;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_profiles_instagram_user_id ON public.profiles(instagram_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_instagram_username ON public.profiles(instagram_username);

-- Comentários
COMMENT ON COLUMN public.profiles.instagram_token IS 'Token de acesso do Instagram para importação de fotos';
COMMENT ON COLUMN public.profiles.instagram_user_id IS 'ID do usuário no Instagram';
COMMENT ON COLUMN public.profiles.instagram_username IS 'Nome de usuário no Instagram';
COMMENT ON COLUMN public.profiles.instagram_connected_at IS 'Data/hora da conexão com Instagram';