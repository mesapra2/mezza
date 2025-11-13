-- ========================================
-- CORREÇÃO DE PERMISSÕES DO STORAGE
-- ========================================
-- 
-- ATENÇÃO: Execute estes comandos via SUPABASE DASHBOARD, não via SQL Editor
-- 
-- MÉTODO 1: VIA DASHBOARD (RECOMENDADO)
-- =====================================
-- 
-- 1. Vá para STORAGE no Supabase Dashboard
-- 2. Clique no bucket 'avatars' (ou crie se não existir)
-- 3. Vá para "Settings" do bucket
-- 4. Marque como "Public bucket" 
-- 5. Vá para "Policies" 
-- 6. Adicione as políticas abaixo usando a interface visual
--
-- POLÍTICA 1: Leitura Pública
-- Nome: "Public read access"
-- Allowed operation: SELECT
-- Código: bucket_id = 'avatars'
--
-- POLÍTICA 2: Upload por usuários autenticados  
-- Nome: "Authenticated users can upload"
-- Allowed operation: INSERT
-- Código: bucket_id = 'avatars' AND auth.role() = 'authenticated'
--
-- POLÍTICA 3: Usuários podem editar suas fotos
-- Nome: "Users can update own files"
-- Allowed operation: UPDATE
-- Código: bucket_id = 'avatars' AND auth.role() = 'authenticated' AND (storage.foldername(name))[1] = auth.uid()::text
--
-- POLÍTICA 4: Usuários podem deletar suas fotos
-- Nome: "Users can delete own files"  
-- Allowed operation: DELETE
-- Código: bucket_id = 'avatars' AND auth.role() = 'authenticated' AND (storage.foldername(name))[1] = auth.uid()::text

-- MÉTODO 2: SQL ALTERNATIVO (se o dashboard não funcionar)
-- ========================================================

-- Primeiro, garantir que o bucket existe e é público
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET
public = true;

-- VERIFICAR SE AS POLÍTICAS JÁ EXISTEM (Execute apenas esta query primeiro)
SELECT 
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname LIKE '%avatar%';

-- ========================================
-- INSTRUÇÕES DETALHADAS PARA O DASHBOARD
-- ========================================

/*
PASSO A PASSO NO SUPABASE DASHBOARD:

1. ACESSAR STORAGE
   - Vá para o Supabase Dashboard
   - Clique em "Storage" no menu lateral

2. CONFIGURAR BUCKET
   - Se o bucket 'avatars' não existir, clique em "New bucket"
   - Nome: avatars
   - Marque "Public bucket" 
   - Clique em "Save"
   
   - Se já existir, clique no bucket 'avatars'
   - Clique no ícone de configurações (engrenagem)
   - Certifique-se que "Public bucket" está marcado

3. CONFIGURAR POLÍTICAS
   - No bucket 'avatars', clique em "Policies"
   - Clique em "New Policy"
   
   POLÍTICA 1:
   - Nome: Public read access
   - Allowed operation: SELECT
   - Target roles: public
   - USING expression: bucket_id = 'avatars'
   
   POLÍTICA 2:
   - Nome: Authenticated users can upload
   - Allowed operation: INSERT  
   - Target roles: authenticated
   - WITH CHECK expression: bucket_id = 'avatars' AND auth.role() = 'authenticated'
   
   POLÍTICA 3:
   - Nome: Users can update own files
   - Allowed operation: UPDATE
   - Target roles: authenticated  
   - USING expression: bucket_id = 'avatars' AND auth.role() = 'authenticated' AND (storage.foldername(name))[1] = auth.uid()::text
   
   POLÍTICA 4:
   - Nome: Users can delete own files
   - Allowed operation: DELETE
   - Target roles: authenticated
   - USING expression: bucket_id = 'avatars' AND auth.role() = 'authenticated' AND (storage.foldername(name))[1] = auth.uid()::text

4. TESTAR
   - Faça upload de uma imagem via app
   - A URL deve ser acessível publicamente
*/

-- ========================================
-- TESTE MANUAL
-- ========================================
-- 
-- Após executar o SQL acima, teste manualmente:
-- 
-- 1. Vá para Storage > avatars no Supabase Dashboard
-- 2. Verifique se o bucket está marcado como "Public"
-- 3. Faça upload de uma imagem de teste
-- 4. Tente acessar a URL pública da imagem
-- 
-- URL de teste: https://[seu-projeto].supabase.co/storage/v1/object/public/avatars/[caminho-da-imagem]

-- ========================================
-- CONFIRMAÇÃO
-- ========================================

-- Verificar se o bucket foi criado corretamente
SELECT id, name, public FROM storage.buckets WHERE id = 'avatars';