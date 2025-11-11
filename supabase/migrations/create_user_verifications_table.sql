-- Criar tabela para verificações de usuário
CREATE TABLE IF NOT EXISTS public.user_verifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    cpf VARCHAR(11) NOT NULL,
    document_front_url TEXT,
    document_back_url TEXT,
    selfie_url TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ NULL,
    reviewed_by UUID NULL REFERENCES auth.users(id),
    rejection_reason TEXT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id),
    UNIQUE(cpf)
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_user_verifications_user_id ON public.user_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_verifications_status ON public.user_verifications(status);
CREATE INDEX IF NOT EXISTS idx_user_verifications_cpf ON public.user_verifications(cpf);
CREATE INDEX IF NOT EXISTS idx_user_verifications_submitted_at ON public.user_verifications(submitted_at DESC);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.user_verifications ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuários podem ver apenas suas próprias verificações"
    ON public.user_verifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar apenas suas próprias verificações"
    ON public.user_verifications FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar apenas suas próprias verificações"
    ON public.user_verifications FOR UPDATE
    USING (auth.uid() = user_id OR auth.jwt() ->> 'role' = 'admin')
    WITH CHECK (auth.uid() = user_id OR auth.jwt() ->> 'role' = 'admin');

-- Política para admins verem todas as verificações
CREATE POLICY "Admins podem ver todas as verificações"
    ON public.user_verifications FOR SELECT
    USING (auth.jwt() ->> 'role' = 'admin');

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_user_verifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_user_verifications_updated_at ON public.user_verifications;
CREATE TRIGGER update_user_verifications_updated_at 
    BEFORE UPDATE ON public.user_verifications 
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_user_verifications_updated_at();

-- Adicionar campo is_verified ao profiles se não existir
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'is_verified'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN is_verified BOOLEAN DEFAULT FALSE;
        CREATE INDEX IF NOT EXISTS idx_profiles_is_verified ON public.profiles(is_verified);
    END IF;
END $$;

-- Função para atualizar is_verified no profiles quando verificação for aprovada
CREATE OR REPLACE FUNCTION public.update_profile_verification_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Quando verificação for aprovada, marcar perfil como verificado
    IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
        UPDATE public.profiles 
        SET is_verified = TRUE 
        WHERE id = NEW.user_id;
    END IF;
    
    -- Quando verificação for rejeitada ou expirada, desmarcar perfil
    IF NEW.status IN ('rejected', 'expired') AND OLD.status = 'approved' THEN
        UPDATE public.profiles 
        SET is_verified = FALSE 
        WHERE id = NEW.user_id;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar status no profiles
DROP TRIGGER IF EXISTS update_profile_verification_status ON public.user_verifications;
CREATE TRIGGER update_profile_verification_status 
    AFTER UPDATE OF status ON public.user_verifications 
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_profile_verification_status();

-- Criar bucket para documentos de verificação (se não existir)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'verification-documents',
    'verification-documents', 
    false,
    5242880, -- 5MB
    ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Política de storage para verificação de documentos
CREATE POLICY "Usuários podem fazer upload de seus documentos"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'verification-documents' 
        AND auth.uid()::text = split_part(name, '/', 1)
    );

CREATE POLICY "Usuários podem ver seus próprios documentos"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'verification-documents' 
        AND (auth.uid()::text = split_part(name, '/', 1) OR auth.jwt() ->> 'role' = 'admin')
    );

COMMENT ON TABLE public.user_verifications IS 'Tabela para armazenar verificações de identidade dos usuários';
COMMENT ON COLUMN public.user_verifications.cpf IS 'CPF do usuário para verificação';
COMMENT ON COLUMN public.user_verifications.status IS 'Status da verificação: pending, approved, rejected, expired';
COMMENT ON COLUMN public.user_verifications.metadata IS 'Dados adicionais como IP, user agent, método de submissão';