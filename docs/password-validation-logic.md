# Lógica de Validação de Senha nos Eventos - Mesapra2

## 📋 Análise da Lógica Atual

### 1. **Evento Padrão** (`event_type: 'padrao'`)

**Criador**: Usuário regular
**Local**: Restaurante parceiro (partner_id obrigatório)
**Capacidade**: 1-3 vagas

**Fluxo Atual**:
1. Usuário cria evento e seleciona restaurante
2. Outros usuários se candidatam
3. Anfitrião aprova/rejeita candidaturas
4. 1 minuto antes do evento, senha é gerada automaticamente (`EventStatusService`)
5. **Convidados aprovados** precisam digitar a senha (`event_entry_password`) para validar presença
6. **Anfitrião** não precisa validar nada ❌

**Problema Identificado**:
- Anfitrião não valida presença com o restaurante
- Sem garantia que anfitrião realmente compareceu

---

### 2. **Evento Institucional** (`event_type: 'institucional'`)

**Criador**: Partner (restaurante) - Premium only
**Local**: No próprio restaurante
**Capacidade**: Baseada em `partners.capacity`

**Fluxo Atual**:
1. Partner cria evento
2. Usuários se inscrevem (aprovação automática)
3. Senha é gerada automaticamente
4. **Nenhuma validação de senha implementada** ❌

**Problema Identificado**:
- Não há validação de presença
- Sistema gera senha mas não é usada
- Falta fluxo de entrada para inscritos

---

### 3. **Evento Crusher** (`event_type: 'crusher'`) ✅

**Criador**: Usuário premium
**Participantes**: 2 (criador + convidado)
**Local**: Restaurante parceiro (opcional)

**Fluxo Atual**:
1. Criador convida um usuário específico (`crusher_invited_user_id`)
2. Convidado aceita/rejeita
3. Senha é gerada 1 minuto antes
4. **Ambos** precisam digitar a senha para validar
5. ✅ **FUNCIONANDO CORRETAMENTE**

---

### 4. **Evento Particular** (`event_type: 'particular'`) ✅

**Criador**: Usuário premium
**Local**: Qualquer (sem restaurante)
**Capacidade**: Definida pelo criador

**Fluxo Atual**:
1. Criador define local e convidados
2. Candidatos se inscrevem
3. Anfitrião aprova
4. Senha gerada 1 minuto antes
5. **Todos aprovados** validam com senha
6. ✅ **FUNCIONANDO CORRETAMENTE**

---

## 🔧 Mudanças Necessárias

### **Mudança 1: Evento Padrão - Validação Dupla**

**Objetivo**: Anfitrião deve validar presença com restaurante

**Implementação**:
- Adicionar campo `host_validated` no evento (boolean)
- Anfitrião precisa digitar senha do restaurante para validar evento
- Convidados continuam digitando senha do anfitrião
- Evento só fica "confirmado" após ambas validações

**Opções de Design**:

**Opção A: Senha Dupla (recomendado)**
- `event_entry_password` - senha para convidados (gerada automaticamente)
- `partner_entry_password` - senha do restaurante (configurada pelo partner)
- Anfitrião digita senha do restaurante
- Convidados digitam senha do anfitrião

**Opção B: Senha Única**
- Usar apenas `event_entry_password`
- Anfitrião valida primeiro com restaurante
- Depois compartilha senha com convidados

**Escolhemos Opção A** (mais seguro e rastreável)

---

### **Mudança 2: Evento Institucional - Implementar Validação**

**Objetivo**: Todos inscritos validam com senha do restaurante

**Implementação**:
- Usar `event_entry_password` (gerada automaticamente ou manualmente pelo partner)
- Todos inscritos precisam digitar senha ao chegar
- Partner visualiza quem já entrou em tempo real
- Mesma interface de `EventEntryForm`

---

## 🗂️ Arquivos Afetados

### **Banco de Dados (Supabase)**
- `partners` - adicionar campo `partner_entry_password VARCHAR(4)` (senha fixa do restaurante)
- `events` - campos existentes:
  - `event_entry_password` - senha do evento (já existe)
  - `host_validated` - novo campo (boolean)

### **Services**
- ✅ `EventSecurityService.ts` - adicionar métodos:
  - `validateHostWithRestaurant()` - valida anfitrião
  - `validateGuestWithHost()` - valida convidado (já existe parcialmente)

- ✅ `ParticipationService.ts` - ajustar lógica de acesso

### **Components**
- ✅ `EventEntryForm.jsx` - adicionar modo "host" vs "guest"
- ✅ `EventDetails.jsx` - mostrar status de validação do host
- ✅ `EventPasswordCard.jsx` - mostrar senha do restaurante para host

### **Pages**
- ✅ `CreateEvent.jsx` - avisar sobre validação dupla
- ✅ `CreateEventPartner.jsx` - configurar senha do restaurante
- ✅ `EventManagement.jsx` - mostrar validações

---

## 📐 Diagrama de Fluxo

### Evento Padrão (NOVO)

```
1. Criação do Evento
   └─> Usuário cria evento e escolhe restaurante

2. Aprovação de Candidatos
   └─> Anfitrião aprova convidados

3. 1 minuto antes do evento
   └─> Sistema gera event_entry_password (4 dígitos)

4. No horário do evento
   ├─> ANFITRIÃO:
   │   ├─> Digita partner_entry_password (senha do restaurante)
   │   └─> Sistema marca host_validated = true
   │
   └─> CONVIDADOS:
       ├─> Digitam event_entry_password (senha do anfitrião)
       └─> Sistema marca com_acesso = true

5. Evento só confirma após:
   ├─> host_validated = true
   └─> Pelo menos 1 convidado com com_acesso = true
```

### Evento Institucional (NOVO)

```
1. Criação do Evento
   └─> Partner cria evento

2. Inscrições (automáticas)
   └─> Usuários se inscrevem e são aprovados automaticamente

3. 1 minuto antes do evento
   └─> Sistema gera event_entry_password (4 dígitos)
   └─> OU Partner define senha manualmente

4. No horário do evento
   └─> TODOS INSCRITOS:
       ├─> Digitam event_entry_password
       └─> Sistema marca com_acesso = true

5. Partner visualiza em tempo real quem já entrou
```

---

## 🧪 Testes Necessários

### Cenários a Testar:

1. **Evento Padrão**
   - [ ] Anfitrião tenta entrar sem senha do restaurante
   - [ ] Anfitrião digita senha errada do restaurante
   - [ ] Anfitrião valida corretamente
   - [ ] Convidado tenta entrar antes do anfitrião validar
   - [ ] Convidado valida após anfitrião

2. **Evento Institucional**
   - [ ] Inscrito digita senha correta
   - [ ] Inscrito digita senha errada
   - [ ] Multiple inscritos entrando simultaneamente
   - [ ] Partner visualiza lista de presença

3. **Evento Crusher** (não deve quebrar)
   - [ ] Ambos validam normalmente
   - [ ] Senha gerada corretamente

4. **Evento Particular** (não deve quebrar)
   - [ ] Todos validam normalmente
   - [ ] Sem interferência de lógica de restaurante

---

## 🔐 Segurança

### Considerações:
- Senhas de 4 dígitos (10.000 combinações)
- Validação apenas no horário do evento (±1 min antes)
- Rate limiting para tentativas de senha
- Logs de todas tentativas de acesso
- Partner pode regenerar senha se comprometida

---

## 📱 UI/UX

### EventEntryForm - Modos:

**Modo 1: Host (Anfitrião em Evento Padrão)**
```
🔐 Valide sua Presença
Digite a senha do restaurante
[□] [□] [□] [□]
📝 Peça a senha ao restaurante ao chegar
```

**Modo 2: Guest (Convidado em Evento Padrão/Particular/Crusher)**
```
🔐 Digite a Senha
Digite a senha compartilhada pelo anfitrião
[□] [□] [□] [□]
📝 Peça a senha ao anfitrião
```

**Modo 3: Institutional (Inscrito em Evento Institucional)**
```
🔐 Digite a Senha
Digite a senha compartilhada pelo restaurante
[□] [□] [□] [□]
📝 Veja a senha no cardápio ou pergunte ao atendente
```

---

## 🎯 Prioridades de Implementação

### Fase 1: Estrutura (Database + Services)
1. Adicionar campo `partner_entry_password` em partners
2. Adicionar campo `host_validated` em events
3. Criar método `validateHostWithRestaurant()` em EventSecurityService
4. Criar método `getPartnerPassword()` em EventSecurityService

### Fase 2: Evento Padrão
1. Modificar EventEntryForm para suportar modo "host"
2. Adicionar UI para anfitrião validar
3. Atualizar EventDetails para mostrar status do host
4. Testar fluxo completo

### Fase 3: Evento Institucional
1. Implementar validação em EventEntryForm modo "institutional"
2. Adicionar estatísticas de presença para partner
3. Testar fluxo completo

### Fase 4: Testes e Ajustes
1. Testar que Crusher não quebrou
2. Testar que Particular não quebrou
3. Ajustes de UX
4. Documentação final
