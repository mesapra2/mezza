-- Arquivo temporário para corrigir TUDO - storage + tabelas
-- Execute este SQL no dashboard do Supabase

-- ========================================
-- 1. CRIAR TABELAS NECESSÁRIAS
-- ========================================

-- Tabela ratings (para avaliações)
CREATE TABLE IF NOT EXISTS ratings (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL,
    from_user_id UUID NOT NULL,
    to_user_id UUID NOT NULL,
    rating_type VARCHAR(20) NOT NULL CHECK (rating_type IN ('host', 'participant', 'restaurant')),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, from_user_id, to_user_id, rating_type)
);

-- Tabela event_photos (para fotos dos eventos)
CREATE TABLE IF NOT EXISTS event_photos (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL,
    user_id UUID NOT NULL,
    photo_url TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'aprovado' CHECK (status IN ('aprovado', 'pendente', 'rejeitado')),
    file_size INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_ratings_event_id ON ratings(event_id);
CREATE INDEX IF NOT EXISTS idx_ratings_from_user ON ratings(from_user_id);
CREATE INDEX IF NOT EXISTS idx_event_photos_event_id ON event_photos(event_id);
CREATE INDEX IF NOT EXISTS idx_event_photos_user_id ON event_photos(user_id);

-- ========================================
-- 2. POLÍTICAS RLS PARA TABELAS
-- ========================================

-- Habilitar RLS
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_photos ENABLE ROW LEVEL SECURITY;

-- Políticas para ratings
CREATE POLICY IF NOT EXISTS "Anyone can view ratings" ON ratings FOR SELECT TO public USING (true);
CREATE POLICY IF NOT EXISTS "Users can create ratings" ON ratings FOR INSERT TO authenticated WITH CHECK (auth.uid() = from_user_id);

-- Políticas para event_photos
CREATE POLICY IF NOT EXISTS "Anyone can view approved event photos" ON event_photos FOR SELECT TO public USING (status = 'aprovado');
CREATE POLICY IF NOT EXISTS "Users can upload their own event photos" ON event_photos FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can update their own event photos" ON event_photos FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- ========================================
-- 3. CRIAR BUCKET DE STORAGE (COM POLÍTICAS RLS)
-- ========================================

-- Primeiro, verificar e desabilitar RLS temporariamente para criação do bucket
ALTER TABLE storage.buckets DISABLE ROW LEVEL SECURITY;

-- Criar bucket se não existir
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
  'event-photos', 
  'event-photos', 
  true, 
  5242880, 
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) 
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Reabilitar RLS
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

-- Criar política para buckets se necessário
CREATE POLICY IF NOT EXISTS "Public buckets are viewable by everyone"
ON storage.buckets
FOR SELECT
TO public
USING (true);

-- Política para permitir que admins/service role gerenciem buckets
CREATE POLICY IF NOT EXISTS "Service role can manage buckets"
ON storage.buckets
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ========================================
-- 4. POLÍTICAS DE STORAGE
-- ========================================

-- Política para upload (qualquer usuário autenticado pode fazer upload)
CREATE POLICY IF NOT EXISTS "Users can upload event photos" 
ON storage.objects 
FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'event-photos');

-- Política para visualização (público pode ver todas as fotos)
CREATE POLICY IF NOT EXISTS "Anyone can view event photos" 
ON storage.objects 
FOR SELECT 
TO public 
USING (bucket_id = 'event-photos');

-- Política para update (usuários podem atualizar suas próprias fotos)
CREATE POLICY IF NOT EXISTS "Users can update their own event photos" 
ON storage.objects 
FOR UPDATE 
TO authenticated 
USING (bucket_id = 'event-photos' AND auth.uid()::text = owner);

-- Política para delete (usuários podem deletar suas próprias fotos)
CREATE POLICY IF NOT EXISTS "Users can delete their own event photos" 
ON storage.objects 
FOR DELETE 
TO authenticated 
USING (bucket_id = 'event-photos' AND auth.uid()::text = owner);