# 🐛 Guia de Debug - Sistema de Chat de Eventos

**Data**: 2025-11-04
**Problema Reportado**: "Chat dos eventos não funciona"
**Status**: 🔍 Investigando

---

## 📋 Análise Realizada

### ✅ Arquivos Analisados

1. **`src/features/shared/pages/EventChatPage.jsx`** (431 linhas)
   - ✅ Implementação completa de chat
   - ✅ Supabase realtime configurado
   - ✅ Mensagens são carregadas corretamente
   - ✅ Sistema de perfis e avatars funcionando
   - ✅ Delete de mensagens implementado

2. **`src/utils/chatAvailability.js`** (56 linhas)
   - ✅ Lógica de disponibilidade do chat
   - ⚠️ Pode estar bloqueando acesso indevidamente

3. **Routes em `src/App.jsx`**
   - ✅ Rota configurada: `event/:id/chat`
   - ✅ Componente importado corretamente
   - ✅ Links para `/event/${id}/chat` presentes

### 🎯 Possíveis Causas do Problema

#### **Hipótese 1: Tabela `event_messages` Não Existe** ⚠️ ALTA PROBABILIDADE

**Sintomas**:
- Chat page mostra erro ao carregar
- Console mostra erro: `relation "public.event_messages" does not exist`
- Página não consegue carregar mensagens

**Como Verificar**:
```sql
-- No Supabase SQL Editor
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'event_messages';
```

**Resultado Esperado**: Deve retornar 1 linha com `table_name = 'event_messages'`
**Se retornar vazio**: Tabela não existe! ❌

**Solução**: Executar migration `supabase/migrations/create_event_messages_table.sql`

---

#### **Hipótese 2: RLS Policies Bloqueando Acesso** ⚠️ ALTA PROBABILIDADE

**Sintomas**:
- Página carrega mas não mostra mensagens
- Ao enviar mensagem, nada acontece
- Console pode mostrar erro de permissão

**Como Verificar**:
```sql
-- Verificar se RLS está ativado
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'event_messages';

-- Verificar políticas existentes
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'event_messages';
```

**Resultado Esperado**:
- `rowsecurity = true`
- Pelo menos 3 policies (SELECT, INSERT, DELETE)

**Se não houver policies**: Usuários não conseguem acessar! ❌

**Solução**: Executar migration `supabase/migrations/create_event_messages_table.sql`

---

#### **Hipótese 3: Chat Availability Logic Muito Restritiva** ⚠️ MÉDIA PROBABILIDADE

**Sintomas**:
- Chat page carrega mas mostra mensagem: "Chat não disponível"
- Mensagem diz algo como: "Aguardando X participantes..."

**Lógica Atual** (de `chatAvailability.js`):

```javascript
// Para eventos NÃO institucionais:
// Chat só libera se:
const allVacasPreenchidas = event.approvedCount >= event.vagas;
const eventConfirmado = event.status === 'Confirmado' || event.status === 'Em andamento';

if (!allVacasPreenchidas && !eventConfirmado) {
  return { available: false, reason: '...' };
}
```

**Problema Identificado**: Chat só libera quando:
- TODAS as vagas estão preenchidas OU
- Evento está "Confirmado" ou "Em andamento"

**Cenário Problemático**:
- Evento com 10 vagas, mas apenas 3 aprovados
- Status ainda é "Aberto"
- Chat fica bloqueado! ❌

**Como Verificar**:
```sql
-- Ver eventos e seus status/vagas
SELECT
  e.id,
  e.title,
  e.status,
  e.vagas,
  e.event_type,
  COUNT(ep.id) FILTER (WHERE ep.status = 'aprovado') as aprovados
FROM events e
LEFT JOIN event_participants ep ON ep.event_id = e.id
GROUP BY e.id
ORDER BY e.created_at DESC
LIMIT 20;
```

**Se evento tem**:
- `aprovados < vagas`
- `status = 'Aberto'`
- `event_type != 'institucional'`

→ Chat está BLOQUEADO pela lógica atual! ❌

**Solução Proposta**: Ajustar lógica para liberar chat mais cedo (ver seção de Fixes)

---

#### **Hipótese 4: Real-time Subscription Não Funciona** ⚠️ BAIXA PROBABILIDADE

**Sintomas**:
- Mensagens aparecem após refresh da página
- Mensagens novas não aparecem automaticamente

**Como Verificar**:
1. Abrir chat em 2 navegadores/abas
2. Enviar mensagem em uma aba
3. Ver se aparece na outra aba sem refresh

**Se não aparecer**: Real-time não está funcionando! ❌

**Possíveis Causas**:
- Supabase Realtime não está habilitado para a tabela
- Erro na configuração do canal

**Solução**: Habilitar Realtime no Supabase:
```sql
-- Habilitar realtime para event_messages
ALTER PUBLICATION supabase_realtime ADD TABLE event_messages;
```

---

#### **Hipótese 5: Problema de Foreign Keys** ⚠️ BAIXA PROBABILIDADE

**Sintomas**:
- Erro ao inserir mensagem
- Console mostra erro de violação de FK

**Como Verificar**:
```sql
-- Verificar FKs da tabela
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'event_messages'
  AND tc.constraint_type = 'FOREIGN KEY';
```

**Resultado Esperado**: 2 FKs (event_id → events.id, user_id → auth.users.id)

---

## 🔧 Checklist de Debug

Execute estes passos em ordem:

### **Passo 1: Verificar se Tabela Existe**

```sql
SELECT EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'event_messages'
) as table_exists;
```

- [ ] ✅ Tabela existe
- [ ] ❌ Tabela NÃO existe → **EXECUTAR MIGRATION**

---

### **Passo 2: Verificar RLS Policies**

```sql
SELECT
  policyname,
  cmd as operation,
  CASE WHEN qual IS NOT NULL THEN 'Has conditions' ELSE 'No conditions' END as using_clause
FROM pg_policies
WHERE tablename = 'event_messages';
```

- [ ] ✅ Policies existem (pelo menos 3)
- [ ] ❌ Policies faltando → **EXECUTAR MIGRATION**

---

### **Passo 3: Testar Acesso Direto**

```sql
-- Tentar inserir mensagem de teste
INSERT INTO public.event_messages (event_id, user_id, content)
VALUES (
  (SELECT id FROM events LIMIT 1),
  auth.uid(),
  'Teste de mensagem'
);
```

- [ ] ✅ Insert funcionou
- [ ] ❌ Erro de permissão → **PROBLEMA DE RLS**
- [ ] ❌ Erro de FK → **PROBLEMA DE DADOS**

---

### **Passo 4: Verificar Chat Availability Logic**

**No frontend, abrir console e digitar**:
```javascript
// Pegar evento qualquer
const eventId = 1; // Substituir por ID real

// Fazer query manual
const { data, error } = await supabase
  .from('events')
  .select('id, title, status, vagas, event_type')
  .eq('id', eventId)
  .single();

// Contar aprovados
const { count } = await supabase
  .from('event_participants')
  .select('*', { count: 'exact', head: true })
  .eq('event_id', eventId)
  .eq('status', 'aprovado');

console.log({
  event: data,
  approvedCount: count,
  vagas: data.vagas,
  chatLiberado: count >= data.vagas || data.status === 'Confirmado'
});
```

- [ ] ✅ `chatLiberado = true`
- [ ] ❌ `chatLiberado = false` → **LÓGICA BLOQUEANDO**

---

### **Passo 5: Verificar Realtime**

```sql
-- Verificar se realtime está habilitado
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename = 'event_messages';
```

- [ ] ✅ Realtime habilitado
- [ ] ❌ Realtime desabilitado → **EXECUTAR**: `ALTER PUBLICATION supabase_realtime ADD TABLE event_messages;`

---

## 🛠️ Soluções Propostas

### **Solução 1: Criar Tabela e RLS Policies** (Se tabela não existe)

**Executar**:
```bash
# No Supabase SQL Editor
# Executar conteúdo de: supabase/migrations/create_event_messages_table.sql
```

---

### **Solução 2: Ajustar Lógica de Chat Availability** (Se lógica está bloqueando)

**Opção A: Liberar Chat Após 1 Aprovado** (Recomendado)

Modificar `src/utils/chatAvailability.js`:

```javascript
// Linha 41-50 (substituir)
// Para eventos normais (não institucionais)
if (!isApprovedParticipant) {
  return {
    available: false,
    reason: 'Você precisa ser um participante aprovado para acessar o chat.'
  };
}

// ✅ NOVA LÓGICA: Liberar chat se houver pelo menos 1 participante aprovado
const temParticipantes = event.approvedCount >= 1;
const eventConfirmado = event.status === 'Confirmado' || event.status === 'Em andamento';

if (!temParticipantes && !eventConfirmado) {
  return {
    available: false,
    reason: 'Chat será liberado após o primeiro participante ser aprovado.'
  };
}

return {
  available: true,
  reason: null
};
```

**Opção B: Liberar Chat Imediatamente para Criador** (Já implementado ✅)

O criador já tem acesso imediato (linha 12-17).

**Opção C: Liberar Chat Após Mínimo de Participantes**

```javascript
const minimoParticipantes = 2; // Configurável
const temMinimoParticipantes = event.approvedCount >= minimoParticipantes;
```

---

### **Solução 3: Habilitar Realtime** (Se subscription não funciona)

```sql
-- No Supabase SQL Editor
ALTER PUBLICATION supabase_realtime ADD TABLE event_messages;
```

---

## 📊 Logs de Debug

### **Frontend (Console do Navegador)**

Ao acessar `/event/123/chat`, verificar console para:

```
✅ Sucesso:
- "🔐 Validando senha..."
- Mensagens carregadas
- Nenhum erro de query

❌ Erros comuns:
- "relation 'public.event_messages' does not exist"
- "permission denied for table event_messages"
- "foreign key violation"
- "Chat não disponível" (com reason)
```

### **Backend (Supabase Logs)**

1. Ir para Supabase Dashboard → Logs
2. Filtrar por: `table:event_messages`
3. Procurar por:
   - SELECT queries (devem funcionar)
   - INSERT queries (devem funcionar)
   - DELETE queries (devem funcionar)
   - Erros de RLS

---

## 🎯 Diagnóstico Rápido

Execute este SQL para diagnóstico completo:

```sql
-- ========================================
-- DIAGNÓSTICO COMPLETO: CHAT SYSTEM
-- ========================================

-- 1. Tabela existe?
SELECT
  'Tabela event_messages' as check_item,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_name = 'event_messages'
    ) THEN '✅ EXISTE'
    ELSE '❌ NÃO EXISTE'
  END as status;

-- 2. RLS está ativado?
SELECT
  'RLS Ativado' as check_item,
  CASE
    WHEN (SELECT rowsecurity FROM pg_tables WHERE tablename = 'event_messages')
    THEN '✅ ATIVADO'
    ELSE '❌ DESATIVADO'
  END as status;

-- 3. Quantas policies existem?
SELECT
  'Policies Configuradas' as check_item,
  COUNT(*)::text || ' policies' as status
FROM pg_policies
WHERE tablename = 'event_messages';

-- 4. Realtime habilitado?
SELECT
  'Realtime Habilitado' as check_item,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND tablename = 'event_messages'
    ) THEN '✅ HABILITADO'
    ELSE '❌ DESABILITADO'
  END as status;

-- 5. Quantas mensagens existem?
SELECT
  'Total de Mensagens' as check_item,
  COUNT(*)::text || ' mensagens' as status
FROM event_messages;

-- 6. Eventos com chat potencialmente bloqueado
SELECT
  'Eventos com Chat Bloqueado' as check_item,
  COUNT(*)::text || ' eventos' as status
FROM events e
LEFT JOIN (
  SELECT event_id, COUNT(*) FILTER (WHERE status = 'aprovado') as aprovados
  FROM event_participants
  GROUP BY event_id
) ep ON ep.event_id = e.id
WHERE e.event_type != 'institucional'
  AND e.status NOT IN ('Confirmado', 'Em andamento')
  AND COALESCE(ep.aprovados, 0) < e.vagas;
```

**Resultado Ideal**:
```
check_item                    | status
------------------------------|----------------
Tabela event_messages         | ✅ EXISTE
RLS Ativado                   | ✅ ATIVADO
Policies Configuradas         | 3 policies
Realtime Habilitado           | ✅ HABILITADO
Total de Mensagens            | X mensagens
Eventos com Chat Bloqueado    | 0 eventos (ideal)
```

---

## ✅ Próximos Passos

Após executar diagnóstico:

1. **Se tabela não existe**: Executar `create_event_messages_table.sql`
2. **Se RLS bloqueando**: Executar migration acima
3. **Se lógica bloqueando**: Ajustar `chatAvailability.js`
4. **Se realtime não funciona**: Executar `ALTER PUBLICATION...`
5. **Testar**: Criar evento, aprovar participantes, acessar chat

---

## 📞 Suporte

Em caso de dúvidas, verificar:
- Console do navegador (F12)
- Supabase Dashboard → Logs
- Supabase Dashboard → Database → event_messages

---

**Última Atualização**: 2025-11-04
**Testado Por**: _____________
**Data do Teste**: ___________
