-- ========================================
-- CORREÇÃO URGENTE DE PERMISSÕES - STORAGE
-- ========================================
-- Execute IMEDIATAMENTE no SQL Editor do Supabase

-- 1. TORNAR BUCKET AVATARS PÚBLICO
UPDATE storage.buckets 
SET public = true 
WHERE id = 'avatars';

-- 2. VERIFICAR SE DEU CERTO
SELECT id, name, public 
FROM storage.buckets 
WHERE id = 'avatars';

-- Resultado esperado: public = true

-- ========================================
-- SE O RESULTADO MOSTRAR public = true, ESTÁ CORRIGIDO!
-- ========================================

-- 3. (OPCIONAL) LIMPAR POLÍTICAS RLS CONFLITANTES
-- Execute apenas se ainda houver problemas:

-- DROP POLICY IF EXISTS "Public Access" ON storage.objects;
-- DROP POLICY IF EXISTS "Users can upload avatar" ON storage.objects;
-- DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
-- DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;

-- 4. (OPCIONAL) RECRIAR POLÍTICAS BÁSICAS SE NECESSÁRIO
-- Execute apenas se as fotos ainda não aparecerem:

-- CREATE POLICY "Allow public read" ON storage.objects
-- FOR SELECT USING (bucket_id = 'avatars');

-- CREATE POLICY "Allow authenticated upload" ON storage.objects
-- FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- ========================================
-- TESTE MANUAL APÓS EXECUTAR
-- ========================================
-- 
-- 1. Faça upload de uma nova foto no app
-- 2. A foto deve aparecer imediatamente
-- 3. Se ainda não funcionar, execute as políticas opcionais acima