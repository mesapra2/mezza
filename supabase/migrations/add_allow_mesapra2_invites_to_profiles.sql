-- Adicionar campo allow_mesapra2_invites à tabela profiles
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'allow_mesapra2_invites'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN allow_mesapra2_invites BOOLEAN DEFAULT TRUE;
        
        CREATE INDEX IF NOT EXISTS idx_profiles_allow_mesapra2_invites 
        ON public.profiles(allow_mesapra2_invites);
    END IF;
END $$;

COMMENT ON COLUMN public.profiles.allow_mesapra2_invites IS 'Permite que o usuário receba convites para eventos crusher (Mesapra2)';