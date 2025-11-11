# 🔧 Fix para Erro de Upload de Fotos - Supabase Storage

## Problema Identificado
Erro: `StorageUnknownError: signal is aborted without reason`

## Causas Possíveis
1. **Políticas RLS muito restritivas** no bucket 'avatars'
2. **Timeout de conexão** no Supabase
3. **Permissões incorretas** para uploads

---

## ✅ SOLUÇÕES PARA EXECUTAR NO SUPABASE

### 1. Verificar Bucket 'avatars' existe
```sql
-- Executar no SQL Editor do Supabase
SELECT * FROM storage.buckets WHERE name = 'avatars';
```

### 2. Criar bucket se não existir
```sql
-- Executar no SQL Editor do Supabase
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;
```

### 3. Configurar Políticas RLS Corretas
```sql
-- Executar no SQL Editor do Supabase

-- Remover políticas existentes (se houver conflito)
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;

-- Política para UPLOAD (inserção)
CREATE POLICY "Authenticated users can upload to avatars"
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'avatars');

-- Política para VIEW (seleção/download)  
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'avatars');

-- Política para UPDATE
CREATE POLICY "Users can update own files in avatars"
ON storage.objects FOR UPDATE 
TO authenticated 
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Política para DELETE
CREATE POLICY "Users can delete own files in avatars"
ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
```

### 4. Verificar se RLS está habilitado
```sql
-- Executar no SQL Editor do Supabase
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'objects' AND schemaname = 'storage';

-- Se rowsecurity = false, habilitar:
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
```

### 5. Verificar configuração do bucket
```sql
-- Executar no SQL Editor do Supabase
SELECT * FROM storage.buckets WHERE name = 'avatars';

-- Deve retornar algo como:
-- id: 'avatars', name: 'avatars', public: true
```

---

## 🧪 TESTE APÓS CONFIGURAÇÃO

1. Execute todos os SQLs acima no **SQL Editor do Supabase**
2. Teste upload de uma foto pequena no sistema
3. Verifique logs no console para confirmar sucesso
4. Se ainda houver erro, verifique:
   - **Network**: Conexão estável com Supabase
   - **Auth**: Usuário autenticado corretamente
   - **Browser**: Limpe cache e tente novamente

---

## 📋 CHECKLIST DE VERIFICAÇÃO

- [ ] Bucket 'avatars' existe
- [ ] Bucket 'avatars' é público
- [ ] RLS habilitado em storage.objects
- [ ] Política de INSERT configurada
- [ ] Política de SELECT configurada
- [ ] Política de UPDATE configurada  
- [ ] Política de DELETE configurada
- [ ] Teste de upload funcionando

---

## 🔍 DEBUG ADICIONAL

Se o problema persistir, adicione este log no código:

```javascript
console.log('🔍 Debug upload:', {
  fileName,
  fileSize: processedFile.size,
  fileType: processedFile.type,
  userId: user.id,
  bucket: 'avatars'
});
```

---

## 📞 SUPORTE

Se após executar todas as configurações o erro persistir:

1. Verificar **quotas do Supabase** (storage limits)
2. Conferir **status do Supabase** em status.supabase.com
3. Testar com **arquivo menor** (< 100KB) primeiro
4. Verificar se **outras operações** do Supabase funcionam

---

**Data de criação:** $(date)  
**Status:** Aguardando configuração no Supabase