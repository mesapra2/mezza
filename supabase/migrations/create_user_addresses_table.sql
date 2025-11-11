-- ========================================
-- MIGRAÇÃO: Tabela de Endereços de Usuários
-- ========================================
-- Cria tabela para armazenar endereços de entrega dos usuários

-- 1. Criar tabela de endereços
CREATE TABLE IF NOT EXISTS public.user_addresses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Dados do endereço
    street VARCHAR(255) NOT NULL,
    number VARCHAR(20) NOT NULL,
    complement VARCHAR(100),
    neighborhood VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(2) NOT NULL,
    zip_code VARCHAR(10) NOT NULL,
    
    -- Dados adicionais
    label VARCHAR(50) DEFAULT 'Principal', -- Casa, Trabalho, etc.
    is_default BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Coordenadas (para cálculo de distância)
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Metadados
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id, label),
    CHECK (LENGTH(zip_code) >= 8),
    CHECK (LENGTH(state) = 2),
    CHECK (latitude >= -90 AND latitude <= 90),
    CHECK (longitude >= -180 AND longitude <= 180)
);

-- 2. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON public.user_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_addresses_default ON public.user_addresses(user_id, is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_user_addresses_active ON public.user_addresses(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_addresses_location ON public.user_addresses(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_addresses_zip_code ON public.user_addresses(zip_code);

-- 3. Habilitar RLS (Row Level Security)
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;

-- 4. Criar políticas de segurança
CREATE POLICY "Usuários podem ver apenas seus próprios endereços"
    ON public.user_addresses FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar seus próprios endereços"
    ON public.user_addresses FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus próprios endereços"
    ON public.user_addresses FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar seus próprios endereços"
    ON public.user_addresses FOR DELETE
    USING (auth.uid() = user_id);

-- Política para administradores (opcional)
CREATE POLICY "Admins podem gerenciar todos os endereços"
    ON public.user_addresses FOR ALL
    USING (auth.jwt() ->> 'role' = 'admin');

-- 5. Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_user_addresses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. Trigger para updated_at
DROP TRIGGER IF EXISTS update_user_addresses_updated_at ON public.user_addresses;
CREATE TRIGGER update_user_addresses_updated_at 
    BEFORE UPDATE ON public.user_addresses 
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_user_addresses_updated_at();

-- 7. Função para garantir apenas um endereço padrão por usuário
CREATE OR REPLACE FUNCTION public.ensure_single_default_address()
RETURNS TRIGGER AS $$
BEGIN
    -- Se o novo endereço está sendo marcado como padrão
    IF NEW.is_default = TRUE THEN
        -- Desmarcar outros endereços como padrão para este usuário
        UPDATE public.user_addresses 
        SET is_default = FALSE 
        WHERE user_id = NEW.user_id 
        AND id != COALESCE(NEW.id, gen_random_uuid())
        AND is_default = TRUE;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 8. Trigger para endereço padrão único
DROP TRIGGER IF EXISTS ensure_single_default_address ON public.user_addresses;
CREATE TRIGGER ensure_single_default_address 
    BEFORE INSERT OR UPDATE OF is_default ON public.user_addresses 
    FOR EACH ROW 
    EXECUTE FUNCTION public.ensure_single_default_address();

-- 9. Criar tabela de CEPs (para validação e autocomplete)
CREATE TABLE IF NOT EXISTS public.zip_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    zip_code VARCHAR(10) NOT NULL UNIQUE,
    street VARCHAR(255),
    neighborhood VARCHAR(100),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(2) NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CHECK (LENGTH(zip_code) = 8),
    CHECK (LENGTH(state) = 2)
);

-- 10. Índices para tabela de CEPs
CREATE INDEX IF NOT EXISTS idx_zip_codes_zip_code ON public.zip_codes(zip_code);
CREATE INDEX IF NOT EXISTS idx_zip_codes_city_state ON public.zip_codes(city, state);

-- 11. RLS para CEPs (leitura pública)
ALTER TABLE public.zip_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "CEPs são públicos para leitura"
    ON public.zip_codes FOR SELECT
    USING (true);

-- Apenas admins podem modificar CEPs
CREATE POLICY "Apenas admins podem modificar CEPs"
    ON public.zip_codes FOR ALL
    USING (auth.jwt() ->> 'role' = 'admin');

-- 12. Comentários descritivos
COMMENT ON TABLE public.user_addresses IS 'Endereços de entrega dos usuários';
COMMENT ON COLUMN public.user_addresses.label IS 'Rótulo do endereço (Casa, Trabalho, etc.)';
COMMENT ON COLUMN public.user_addresses.is_default IS 'Se é o endereço padrão do usuário';
COMMENT ON COLUMN public.user_addresses.latitude IS 'Latitude para cálculo de distância';
COMMENT ON COLUMN public.user_addresses.longitude IS 'Longitude para cálculo de distância';

COMMENT ON TABLE public.zip_codes IS 'Base de dados de CEPs para validação e autocomplete';

-- 13. Inserir alguns CEPs de exemplo (São Paulo)
INSERT INTO public.zip_codes (zip_code, street, neighborhood, city, state, latitude, longitude) VALUES
('01310-100', 'Avenida Paulista', 'Bela Vista', 'São Paulo', 'SP', -23.561414, -46.656633),
('04038-001', 'Rua Vergueiro', 'Vila Mariana', 'São Paulo', 'SP', -23.588521, -46.640936),
('05408-000', 'Avenida Rebouças', 'Pinheiros', 'São Paulo', 'SP', -23.563987, -46.670042)
ON CONFLICT (zip_code) DO NOTHING;

-- 14. Função para buscar CEP via API (placeholder)
CREATE OR REPLACE FUNCTION public.lookup_zip_code(p_zip_code TEXT)
RETURNS TABLE (
    street TEXT,
    neighborhood TEXT,
    city TEXT,
    state TEXT,
    latitude DECIMAL,
    longitude DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        zc.street::TEXT,
        zc.neighborhood::TEXT,
        zc.city::TEXT,
        zc.state::TEXT,
        zc.latitude,
        zc.longitude
    FROM public.zip_codes zc
    WHERE zc.zip_code = p_zip_code;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Permitir execução da função para usuários autenticados
GRANT EXECUTE ON FUNCTION public.lookup_zip_code(TEXT) TO authenticated;

-- Sucesso
DO $$
BEGIN
    RAISE NOTICE 'Migração de endereços criada com sucesso!';
    RAISE NOTICE 'Tabelas criadas: user_addresses, zip_codes';
    RAISE NOTICE 'RLS configurado com políticas de segurança';
    RAISE NOTICE 'Triggers criados para updated_at e endereço padrão único';
END $$;