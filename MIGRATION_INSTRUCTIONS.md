# 🚀 Instruções para Aplicar Migration de Validação de Senha

**Data**: 2025-11-04
**Migration**: `add_password_validation_fields.sql`
**Status**: ⚠️ PENDENTE DE EXECUÇÃO

---

## 📋 O Que Esta Migration Faz

Esta migration adiciona suporte para validação dupla de senha em eventos:

1. **`partners.partner_entry_password`** - Senha fixa de 4 dígitos do restaurante
2. **`events.host_validated`** - Flag indicando se anfitrião validou presença
3. **`events.host_validated_at`** - Timestamp da validação
4. **Indexes** para performance
5. **Trigger** de validação de formato (4 dígitos)

---

## ⚠️ IMPORTANTE: Leia Antes de Executar

### Backup
✅ **Faça backup do banco antes de executar!**

### Impacto
- ✅ **Sem impacto em dados existentes** - apenas adiciona colunas
- ✅ **Não quebra funcionalidades atuais** - colunas têm valores default
- ✅ **Sem downtime** - operação é segura

### Tempo Estimado
- ~5 segundos para executar
- Operação DDL simples (ALTER TABLE)

---

## 🔧 Passos para Executar

### 1. Acessar Supabase Dashboard

```
https://supabase.com/dashboard/project/SEU_PROJECT_ID
```

Navegue até: **SQL Editor** (menu lateral esquerdo)

---

### 2. Copiar Conteúdo da Migration

Abra o arquivo:
```
supabase/migrations/add_password_validation_fields.sql
```

Copie TODO o conteúdo (Ctrl+A, Ctrl+C)

---

### 3. Executar no SQL Editor

1. Clique em **"New query"**
2. Cole o conteúdo da migration
3. Clique em **"Run"** (ou Ctrl+Enter)

Você verá algo como:
```
Success. No rows returned
```

---

### 4. Verificar Instalação

Execute estas queries de verificação:

```sql
-- Verificar coluna em partners
SELECT
  column_name,
  data_type,
  character_maximum_length,
  column_default
FROM information_schema.columns
WHERE table_name = 'partners'
  AND column_name = 'partner_entry_password';
```

**Resultado Esperado**:
```
column_name              | partner_entry_password
data_type                | character varying
character_maximum_length | 4
column_default           | NULL
```

---

```sql
-- Verificar colunas em events
SELECT
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'events'
  AND column_name IN ('host_validated', 'host_validated_at');
```

**Resultado Esperado**:
```
column_name       | host_validated
data_type         | boolean
column_default    | false

column_name       | host_validated_at
data_type         | timestamp with time zone
column_default    | NULL
```

---

### 5. Verificar Indexes

```sql
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('partners', 'events')
  AND indexname LIKE 'idx_%entry%';
```

**Resultado Esperado**: 2 indexes criados

---

### 6. Verificar Trigger

```sql
SELECT
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'validate_partner_password_trigger';
```

**Resultado Esperado**:
```
trigger_name                      | validate_partner_password_trigger
event_manipulation                | INSERT, UPDATE
event_object_table                | partners
```

---

## ✅ Pós-Migration: Configurar Senhas

Após executar a migration, configure senhas para os restaurantes parceiros.

### Opção A: Senha Específica para Um Restaurante

```sql
-- Configurar senha 1234 para restaurante ID 1
UPDATE partners
SET partner_entry_password = '1234'
WHERE id = 1;
```

### Opção B: Senhas Aleatórias para Todos

```sql
-- Gerar senhas de 4 dígitos aleatórias
UPDATE partners
SET partner_entry_password = LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0')
WHERE partner_entry_password IS NULL;
```

### Opção C: Senhas Sequenciais (Apenas Teste)

```sql
-- NÃO USE EM PRODUÇÃO!
UPDATE partners
SET partner_entry_password = LPAD(id::TEXT, 4, '0')
WHERE partner_entry_password IS NULL
  AND id < 10000;
```

---

## 📊 Verificar Senhas Configuradas

```sql
-- Ver todos partners com/sem senha
SELECT
  id,
  name,
  partner_entry_password,
  CASE
    WHEN partner_entry_password IS NULL THEN '❌ Sem senha'
    ELSE '✅ Com senha'
  END as status
FROM partners
ORDER BY id;
```

---

## 🧪 Testar Validação do Trigger

O trigger garante que apenas senhas de 4 dígitos são aceitas:

```sql
-- ✅ DEVE FUNCIONAR (4 dígitos)
UPDATE partners SET partner_entry_password = '1234' WHERE id = 1;

-- ❌ DEVE FALHAR (3 dígitos)
UPDATE partners SET partner_entry_password = '123' WHERE id = 1;
-- Error: partner_entry_password must be exactly 4 digits

-- ❌ DEVE FALHAR (5 dígitos)
UPDATE partners SET partner_entry_password = '12345' WHERE id = 1;
-- Error: partner_entry_password must be exactly 4 digits

-- ❌ DEVE FALHAR (letras)
UPDATE partners SET partner_entry_password = 'ABCD' WHERE id = 1;
-- Error: partner_entry_password must be exactly 4 digits
```

---

## 🔐 Ajustar RLS Policies (Opcional)

Se você quer que partners possam atualizar suas próprias senhas via frontend:

```sql
-- Permitir partners atualizarem sua própria senha
CREATE POLICY "Partners can update own entry password"
ON partners
FOR UPDATE
USING (auth.uid() = user_id)  -- Ajuste conforme sua estrutura
WITH CHECK (auth.uid() = user_id);
```

**⚠️ Nota**: Ajuste `user_id` conforme o campo que relaciona partner com usuário autenticado.

---

## 🚨 Troubleshooting

### Erro: "column already exists"

Se você já executou a migration antes:

```sql
-- Verificar se colunas já existem
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'partners'
  AND column_name = 'partner_entry_password';
```

Se retornar resultados, a migration já foi executada. Pule para o passo de configuração de senhas.

---

### Erro: "permission denied"

Certifique-se de estar usando um usuário com permissões de DDL (ALTER TABLE).

No Supabase Dashboard, você já tem permissões adequadas por padrão.

---

### Erro: "trigger already exists"

```sql
-- Dropar trigger existente
DROP TRIGGER IF EXISTS validate_partner_password_trigger ON partners;

-- Recriar
CREATE TRIGGER validate_partner_password_trigger
  BEFORE INSERT OR UPDATE ON partners
  FOR EACH ROW
  EXECUTE FUNCTION validate_partner_entry_password();
```

---

## 📈 Monitoramento Pós-Migration

### Ver eventos que precisam de host validation

```sql
SELECT
  e.id,
  e.title,
  e.event_type,
  e.partner_id,
  e.host_validated,
  p.name as restaurant_name,
  p.partner_entry_password as restaurant_has_password
FROM events e
LEFT JOIN partners p ON e.partner_id = p.id
WHERE e.event_type = 'padrao'
  AND e.partner_id IS NOT NULL
  AND e.host_validated = FALSE
ORDER BY e.start_time DESC
LIMIT 20;
```

---

### Ver partners sem senha configurada

```sql
SELECT
  id,
  name,
  capacity,
  created_at
FROM partners
WHERE partner_entry_password IS NULL
ORDER BY created_at DESC;
```

---

## ✅ Checklist de Conclusão

Após executar a migration, verifique:

- [ ] Migration executada sem erros
- [ ] Colunas criadas em `partners` e `events`
- [ ] Indexes criados
- [ ] Trigger criado e funcionando
- [ ] Senhas configuradas em pelo menos 1 partner de teste
- [ ] Trigger validando formato (testado com senha inválida)
- [ ] RLS policies ajustadas (se necessário)
- [ ] Documentação atualizada internamente

---

## 🎯 Próximos Passos Após Migration

1. **Configurar Senhas**: Use Opção A/B acima
2. **Testar Frontend**: Criar evento padrão e testar validação
3. **Testar Institucional**: Criar evento institucional e testar inscrições
4. **Monitorar Logs**: Verificar console do navegador durante testes
5. **Criar UI de Configuração**: Permitir partners configurarem senha via frontend (futuro)

---

## 📞 Suporte

Em caso de problemas:
1. Verificar logs do Supabase Dashboard
2. Consultar `docs/password-validation-*.md` (local)
3. Revisar código em `src/services/EventSecurityService.ts`
4. Testar queries de verificação acima

---

**✅ Migration Pronta para Uso!**

Execute quando estiver pronto. Tempo estimado: ~5 minutos.
