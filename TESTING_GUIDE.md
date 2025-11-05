# 🧪 Guia de Testes - Sistema de Validação de Senha

**Data**: 2025-11-04
**Versão**: 1.0

---

## 📋 Visão Geral

Este guia detalha os testes necessários para validar o novo sistema de validação dupla de senha, garantindo que:

1. **Novos fluxos funcionam** (Padrão e Institucional)
2. **Fluxos existentes não quebraram** (Crusher e Particular)

---

## ⚙️ Pré-Requisitos

Antes de começar os testes:

- [ ] Migration executada no Supabase (`add_password_validation_fields.sql`)
- [ ] Código atualizado (branch main, commit `77a6a54`)
- [ ] Pelo menos 1 restaurante com senha configurada
- [ ] Ambiente de teste ou staging disponível
- [ ] 2-3 contas de usuário para testes

---

## 🎯 Cenários de Teste

### 1. EVENTO PADRÃO - Novo Fluxo ⭐

**Objetivo**: Validar fluxo completo com validação dupla

#### Setup
1. Login como usuário regular (não premium)
2. Navegar para `/criar-evento`
3. Criar evento tipo "Padrão"
   - Título: "Teste Padrão - Validação Dupla"
   - Restaurante: Selecionar um com senha configurada
   - Data: Hoje + 5 minutos
   - Vagas: 2

#### Teste 1.1: Anfitrião Valida com Restaurante

**Passos**:
1. Aguardar até 1 minuto antes do horário do evento
2. Abrir página do evento
3. Verificar se aparece: **"🏪 Valide sua Presença"**
4. Tentar senha ERRADA do restaurante
   - **Esperado**: Erro "Senha do restaurante incorreta"
5. Digitar senha CORRETA do restaurante
   - **Esperado**: ✅ "Presença validada com o restaurante!"

**Verificação no Banco**:
```sql
SELECT
  id,
  title,
  host_validated,
  host_validated_at
FROM events
WHERE title LIKE '%Teste Padrão%';
```

**Esperado**:
- `host_validated` = `true`
- `host_validated_at` = timestamp recente

#### Teste 1.2: Convidado Valida com Anfitrião

**Passos**:
1. Login com **segunda conta de usuário**
2. Candidatar-se ao evento
3. Login como anfitrião novamente
4. Aprovar candidatura
5. Login como convidado
6. Abrir página do evento
7. Verificar se aparece: **"🔐 Digite a Senha"** (modo guest)
8. Tentar senha ERRADA
   - **Esperado**: Erro "Senha incorreta"
9. Digitar senha CORRETA (event_entry_password, gerada automaticamente)
   - **Esperado**: ✅ "Bem-vindo ao evento!"

**Verificação no Banco**:
```sql
SELECT
  user_id,
  status,
  com_acesso,
  presenca_confirmada
FROM event_participants
WHERE event_id = <ID_DO_EVENTO>;
```

**Esperado**:
- `com_acesso` = `true`
- `presenca_confirmada` = `true`

**Status**: [ ] ✅ PASSOU | [ ] ❌ FALHOU | [ ] ⏳ PENDENTE

---

### 2. EVENTO INSTITUCIONAL - Novo Fluxo ⭐

**Objetivo**: Validar inscrição automática e entrada com senha do restaurante

#### Setup
1. Login como **partner** (restaurante)
2. Navegar para `/criar-evento` (page de partner)
3. Criar evento tipo "Institucional"
   - Título: "Teste Institucional - Happy Hour"
   - Data: Hoje + 5 minutos
   - Vagas: 10

#### Teste 2.1: Inscrito Valida com Restaurante

**Passos**:
1. Login como **usuário regular**
2. Buscar evento "Teste Institucional"
3. Candidatar-se ao evento
   - **Esperado**: Aprovação automática (status = 'aprovado')
4. Aguardar até horário do evento
5. Abrir página do evento
6. Verificar se aparece: **"🔐 Digite a Senha"** (modo institutional)
7. Tentar senha ERRADA
   - **Esperado**: Erro "Senha incorreta"
8. Digitar senha CORRETA (event_entry_password)
   - **Esperado**: ✅ "Bem-vindo ao evento!"

**Verificação no Banco**:
```sql
SELECT
  user_id,
  status,
  com_acesso
FROM event_participants
WHERE event_id = <ID_DO_EVENTO>;
```

**Esperado**:
- `status` = `'aprovado'` (já aprovado na inscrição)
- `com_acesso` = `true`

**Status**: [ ] ✅ PASSOU | [ ] ❌ FALHOU | [ ] ⏳ PENDENTE

---

### 3. EVENTO CRUSHER - Regressão ✅

**Objetivo**: Garantir que fluxo existente não quebrou

#### Setup
1. Login como usuário **premium**
2. Navegar para `/criar-evento/crusher`
3. Criar evento tipo "Crusher"
   - Título: "Teste Crusher - Não Quebrou"
   - Convidar usuário específico
   - Restaurante: Opcional
   - Data: Hoje + 5 minutos

#### Teste 3.1: Convidado Aceita e Valida

**Passos**:
1. Login como **convidado**
2. Aceitar convite
3. Aguardar horário do evento
4. Abrir página do evento
5. Verificar se aparece: **"🔐 Digite a Senha"** (modo guest)
6. Digitar senha (event_entry_password)
   - **Esperado**: ✅ "Bem-vindo ao evento!"

#### Teste 3.2: Criador Valida

**Passos**:
1. Login como **criador**
2. Abrir página do evento
3. Verificar se aparece: **"🔐 Digite a Senha"** (modo guest, NÃO host)
4. Digitar senha (mesma do convidado)
   - **Esperado**: ✅ "Bem-vindo ao evento!"

**Verificação**:
- ❗ **Criador NÃO deve ver modo "host"** (só em eventos padrão)
- ❗ **Ambos usam mesma senha** (event_entry_password)

**Status**: [ ] ✅ PASSOU | [ ] ❌ FALHOU | [ ] ⏳ PENDENTE

---

### 4. EVENTO PARTICULAR - Regressão ✅

**Objetivo**: Garantir que fluxo existente não quebrou

#### Setup
1. Login como usuário **premium**
2. Navegar para `/criar-evento/particular`
3. Criar evento tipo "Particular"
   - Título: "Teste Particular - Casa da Vó"
   - Local: Endereço qualquer (sem restaurante)
   - Data: Hoje + 5 minutos
   - Vagas: 3

#### Teste 4.1: Convidados Validam

**Passos**:
1. Aprovar 2 candidatos
2. Login como **convidado 1**
3. Abrir página do evento (no horário)
4. Verificar se aparece: **"🔐 Digite a Senha"** (modo guest)
5. Digitar senha (event_entry_password)
   - **Esperado**: ✅ "Bem-vindo ao evento!"
6. Repetir com **convidado 2**

#### Teste 4.2: Anfitrião Valida

**Passos**:
1. Login como **criador**
2. Abrir página do evento
3. Verificar se aparece: **"🔐 Digite a Senha"** (modo guest, NÃO host)
4. Digitar senha (mesma dos convidados)
   - **Esperado**: ✅ "Bem-vindo ao evento!"

**Verificação**:
- ❗ **Anfitrião NÃO deve ver modo "host"** (só em eventos padrão com restaurante)
- ❗ **Todos usam mesma senha**

**Status**: [ ] ✅ PASSOU | [ ] ❌ FALHOU | [ ] ⏳ PENDENTE

---

## 🔍 Testes de Edge Cases

### Edge Case 1: Restaurante Sem Senha

**Cenário**: Criar evento padrão em restaurante que não configurou senha

**Passos**:
1. Criar evento padrão
2. Selecionar restaurante SEM `partner_entry_password`
3. Tentar validar como anfitrião

**Esperado**:
- Erro: "Restaurante ainda não configurou senha de entrada"

**Como Corrigir**:
```sql
-- Configurar senha no restaurante
UPDATE partners
SET partner_entry_password = '1234'
WHERE id = <PARTNER_ID>;
```

**Status**: [ ] ✅ PASSOU | [ ] ❌ FALHOU | [ ] ⏳ PENDENTE

---

### Edge Case 2: Usuário Não Aprovado Tenta Entrar

**Cenário**: Candidato com status 'pendente' tenta validar senha

**Passos**:
1. Candidatar-se a evento
2. **NÃO ser aprovado** (status = 'pendente')
3. Tentar digitar senha no horário do evento

**Esperado**:
- Erro: "Você não está inscrito neste evento" ou "Sua inscrição está com status: pendente"

**Status**: [ ] ✅ PASSOU | [ ] ❌ FALHOU | [ ] ⏳ PENDENTE

---

### Edge Case 3: Evento Sem Restaurante (Tipo Padrão)

**Cenário**: Bug na criação - evento padrão sem partner_id

**Passos**:
1. Via SQL, criar evento tipo 'padrao' com `partner_id = NULL`
2. Tentar abrir como anfitrião

**Esperado**:
- Sistema detecta e mostra erro ou modo 'none'
- NÃO deve crashar

**Status**: [ ] ✅ PASSOU | [ ] ❌ FALHOU | [ ] ⏳ PENDENTE

---

### Edge Case 4: Múltiplos Inscritos Simultâneos

**Cenário**: Vários usuários validando ao mesmo tempo (evento institucional)

**Passos**:
1. Criar evento institucional com 10 vagas
2. Inscrever 5 usuários
3. Todos digitarem senha simultaneamente (se possível)

**Esperado**:
- Todos conseguem validar
- Sem race conditions
- `com_acesso` marcado para todos

**Status**: [ ] ✅ PASSOU | [ ] ❌ FALHOU | [ ] ⏳ PENDENTE

---

## 📊 Checklist de Validação Final

### Funcionalidades Novas
- [ ] Evento Padrão: Anfitrião valida com restaurante
- [ ] Evento Padrão: Convidados validam com anfitrião
- [ ] Evento Institucional: Inscritos validam com restaurante
- [ ] EventEntryForm detecta tipo corretamente
- [ ] Mensagens apropriadas por tipo
- [ ] host_validated é marcado corretamente

### Regressão (Não Deve Quebrar)
- [ ] Evento Crusher funciona normalmente
- [ ] Evento Particular funciona normalmente
- [ ] Senha é gerada automaticamente (todos os tipos)
- [ ] Validação de horário funciona
- [ ] Participantes aprovados conseguem entrar

### Edge Cases
- [ ] Restaurante sem senha é detectado
- [ ] Usuário não aprovado não entra
- [ ] Evento sem restaurante não crasha
- [ ] Múltiplos usuários simultâneos funciona

### UX
- [ ] Loading state aparece corretamente
- [ ] Mensagens de erro são claras
- [ ] Mensagens de sucesso são apropriadas
- [ ] Formulário limpa após erro
- [ ] Toast notifications funcionam

---

## 🐛 Relatório de Bugs

Use este template para reportar bugs encontrados:

```markdown
### Bug: [Título]

**Cenário**: [Qual teste]
**Passos para Reproduzir**:
1. ...
2. ...
3. ...

**Esperado**: ...
**Obtido**: ...

**Console Log**:
```
[colar logs relevantes]
```

**SQL Debug** (se aplicável):
```sql
[queries usadas para debug]
```

**Screenshots**: [anexar se relevante]

**Prioridade**: [ ] Alta | [ ] Média | [ ] Baixa
```

---

## 📈 Métricas de Sucesso

Após testes, preencher:

- **Total de testes**: ___ / 14
- **Passou**: ___
- **Falhou**: ___
- **Pendente**: ___

- **Regressão**: [ ] ✅ SEM PROBLEMAS | [ ] ⚠️ COM PROBLEMAS

**Aprovado para produção**: [ ] SIM | [ ] NÃO

---

## ✅ Conclusão

Após completar todos os testes:

1. Marcar status de cada teste
2. Documentar bugs encontrados
3. Corrigir bugs críticos
4. Re-testar fluxos afetados
5. Atualizar este documento
6. Deploy quando tudo passar

---

**Última Atualização**: 2025-11-04
**Testado Por**: _____________
**Data dos Testes**: ___________
