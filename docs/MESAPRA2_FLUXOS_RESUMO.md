# 📱 Mesapra2 - Resumo dos Fluxos Principais

**Data**: 2025-11-04
**Versão**: 2.0 (com validação dupla de senha)

---

## 🎯 O Que é o Mesapra2

Plataforma de jantares sociais que conecta pessoas através de eventos gastronômicos.

**Usuários**:
- 👤 **Usuários Regulares** (Free e Premium)
- 🏪 **Partners (Restaurantes)** (Free e Premium)

---

## 📊 Tipos de Eventos

### 1. **Evento PADRÃO** 🍽️
- **Criado por**: Usuário regular
- **Local**: Restaurante parceiro (obrigatório)
- **Capacidade**: 1-3 vagas
- **Aprovação**: Anfitrião aprova candidatos manualmente

**Novo Fluxo de Validação** ⭐:
```
1. Usuário cria evento → Escolhe restaurante
2. Outros usuários se candidatam
3. Anfitrião aprova/rejeita candidatos
4. 1 minuto antes: Sistema gera senha do evento (4 dígitos)
5. NO HORÁRIO DO EVENTO:

   ANFITRIÃO:
   ├─ Chega no restaurante
   ├─ Abre app → Página do evento
   ├─ Vê: "🏪 Valide sua Presença"
   ├─ Pede senha ao atendente do restaurante
   ├─ Digita senha do restaurante (partner_entry_password)
   └─ Sistema marca: host_validated = true ✅

   CONVIDADOS:
   ├─ Chegam no evento
   ├─ Abrem app → Página do evento
   ├─ Veem: "🔐 Digite a Senha"
   ├─ Anfitrião compartilha senha do evento
   ├─ Digitam senha do evento (event_entry_password)
   └─ Sistema marca: com_acesso = true ✅
```

**Objetivo**: Validar presença de TODOS (anfitrião com restaurante + convidados com anfitrião)

---

### 2. **Evento INSTITUCIONAL** 🏢
- **Criado por**: Partner (restaurante) - Apenas Premium
- **Local**: No próprio restaurante
- **Capacidade**: Definida pelo partner (ex: 50 vagas)
- **Aprovação**: AUTOMÁTICA (todos são aprovados ao se inscrever)

**Novo Fluxo de Validação** ⭐:
```
1. Partner cria evento (ex: "Happy Hour Quinta")
2. Usuários se inscrevem → Aprovação automática
3. 1 minuto antes: Sistema gera senha do evento
4. NO HORÁRIO DO EVENTO:

   TODOS INSCRITOS:
   ├─ Chegam no restaurante
   ├─ Abrem app → Página do evento
   ├─ Veem: "🔐 Digite a Senha"
   ├─ Veem senha no cardápio ou pedem ao atendente
   ├─ Digitam senha do evento (event_entry_password)
   └─ Sistema marca: com_acesso = true ✅

   PARTNER:
   ├─ Visualiza em tempo real quem já entrou
   └─ Dashboard mostra: X de Y pessoas entraram
```

**Objetivo**: Controle de entrada do restaurante + métricas de comparecimento

---

### 3. **Evento CRUSHER** 💜
- **Criado por**: Usuário premium
- **Participantes**: 2 pessoas (criador + 1 convidado específico)
- **Local**: Restaurante parceiro (opcional)
- **Aprovação**: Convidado aceita/rejeita convite

**Fluxo de Validação** (não mudou):
```
1. Usuário premium cria evento Crusher
2. Convida usuário específico (crusher_invited_user_id)
3. Convidado recebe notificação
4. Convidado aceita ou rejeita
5. Se aceito: 1 minuto antes, senha é gerada
6. NO HORÁRIO:

   AMBOS (criador + convidado):
   ├─ Abrem app → Página do evento
   ├─ Veem: "🔐 Digite a Senha"
   ├─ Digitam MESMA senha (event_entry_password)
   └─ Sistema marca: com_acesso = true ✅
```

**Objetivo**: Encontro 1-a-1 para networking/romance

---

### 4. **Evento PARTICULAR** 🏠
- **Criado por**: Usuário premium
- **Local**: Qualquer (casa, parque, etc.) - SEM restaurante
- **Capacidade**: Definida pelo criador
- **Aprovação**: Anfitrião aprova candidatos

**Fluxo de Validação** (não mudou):
```
1. Usuário premium cria evento
2. Define local (endereço livre)
3. Usuários se candidatam
4. Anfitrião aprova/rejeita
5. 1 minuto antes: Senha é gerada
6. NO HORÁRIO:

   TODOS (anfitrião + convidados):
   ├─ Abrem app → Página do evento
   ├─ Veem: "🔐 Digite a Senha"
   ├─ Digitam MESMA senha (event_entry_password)
   └─ Sistema marca: com_acesso = true ✅
```

**Objetivo**: Eventos privados sem vínculo com restaurante

---

## 🔐 Senhas do Sistema

### **event_entry_password** (4 dígitos)
- **Gerada por**: Sistema (automaticamente)
- **Quando**: 1 minuto antes do evento
- **Usada por**:
  - Convidados em eventos PADRÃO
  - Todos em eventos INSTITUCIONAL
  - Todos em eventos CRUSHER
  - Todos em eventos PARTICULAR
- **Formato**: 4 dígitos numéricos (ex: "1234")

### **partner_entry_password** (4 dígitos) ⭐ NOVO
- **Configurada por**: Restaurante (manualmente)
- **Quando**: A qualquer momento (antes do evento)
- **Usada por**:
  - Anfitrião em eventos PADRÃO (validação com restaurante)
- **Formato**: 4 dígitos numéricos (ex: "5678")

---

## 👥 Fluxos por Tipo de Usuário

### **USUÁRIO FREE** (Gratuito)
**Pode Fazer**:
- ✅ Criar até 2 eventos PADRÃO
- ✅ Participar de eventos (ilimitado)
- ✅ Candidatar-se a qualquer evento
- ✅ Avaliar eventos e participantes
- ✅ Chat nos eventos (após aprovação)

**Não Pode**:
- ❌ Criar eventos CRUSHER
- ❌ Criar eventos PARTICULAR
- ❌ Criar mais de 2 eventos simultaneamente
- ❌ Filtros avançados
- ❌ Analytics

---

### **USUÁRIO PREMIUM** 💎
**Pode Fazer**:
- ✅ Tudo do Free +
- ✅ Criar eventos CRUSHER (1-a-1)
- ✅ Criar eventos PARTICULAR (sem restaurante)
- ✅ Eventos ilimitados
- ✅ Participantes ilimitados
- ✅ Filtros avançados
- ✅ Analytics e métricas
- ✅ Temas personalizados

---

### **PARTNER FREE** (Restaurante Gratuito)
**Pode Fazer**:
- ✅ Perfil de restaurante
- ✅ Receber eventos PADRÃO
- ✅ Configurar senha de entrada
- ✅ Ver eventos no seu restaurante

**Não Pode**:
- ❌ Criar eventos INSTITUCIONAL
- ❌ Analytics avançado
- ❌ API access
- ❌ Branding customizado

---

### **PARTNER PREMIUM** 🏆
**Pode Fazer**:
- ✅ Tudo do Partner Free +
- ✅ Criar eventos INSTITUCIONAL (próprios)
- ✅ Analytics avançado
- ✅ API access
- ✅ Branding customizado
- ✅ Suporte prioritário

---

## 📱 Jornadas Típicas

### Jornada 1: Usuário Regular Cria Evento Padrão

```
1. Login → Dashboard
2. Clicar "Criar Evento"
3. Escolher tipo: "Padrão"
4. Preencher:
   ├─ Título (ex: "Jantar Italiano")
   ├─ Descrição
   ├─ Restaurante (buscar e selecionar)
   ├─ Data e horário
   ├─ Vagas (1-3)
   └─ Hashtags
5. Criar evento → Status: "Aberto"
6. Aguardar candidaturas
7. Aprovar candidatos → Status: "Confirmado"
8. 1 min antes: Senha gerada
9. NO HORÁRIO:
   ├─ Ir ao restaurante
   ├─ Pedir senha ao atendente
   ├─ Validar no app com senha do restaurante ✅
   ├─ Compartilhar senha do evento com convidados
   └─ Todos entram com senha do evento ✅
10. Após evento: Avaliar participantes
```

---

### Jornada 2: Partner Cria Evento Institucional

```
1. Login como Partner → Dashboard
2. Clicar "Criar Evento Institucional"
3. Preencher:
   ├─ Título (ex: "Happy Hour Quinta-Feira")
   ├─ Descrição (ex: "Chopp em dobro!")
   ├─ Data e horário
   └─ Vagas (ex: 50)
4. Criar evento → Status: "Aberto"
5. Usuários se inscrevem (aprovação automática)
6. 1 min antes: Senha gerada
7. NO HORÁRIO:
   ├─ Colocar senha no cardápio ou avisar atendentes
   ├─ Inscritos chegam e digitam senha no app
   └─ Dashboard mostra: "12 de 50 entraram"
8. Após evento: Ver analytics (taxa de comparecimento, etc.)
```

---

### Jornada 3: Usuário Participa de Evento

```
1. Login → Buscar Eventos
2. Filtrar por:
   ├─ Tipo (Padrão/Crusher/Institucional)
   ├─ Data
   ├─ Local
   └─ Hashtags
3. Encontrar evento interessante
4. Clicar → Ver detalhes
5. Candidatar-se (com mensagem opcional)
6. Aguardar aprovação (se não for institucional)
7. Aprovação recebida → Notificação
8. NO HORÁRIO:
   ├─ Ir ao local
   ├─ Abrir app → Página do evento
   ├─ Pedir senha (anfitrião ou restaurante)
   ├─ Digitar senha ✅
   └─ Acesso liberado!
9. Participar do evento
10. Após: Avaliar evento e participantes
```

---

## 🔄 Estados dos Eventos

```
1. ABERTO
   ├─ Evento criado
   ├─ Aceitando candidaturas
   └─ Aguardando aprovações

2. CONFIRMADO
   ├─ Participantes mínimos atingidos
   ├─ Anfitrião confirmou
   └─ Evento vai acontecer

3. EM ANDAMENTO
   ├─ Horário do evento chegou
   ├─ Senha gerada
   ├─ Participantes entrando
   └─ Evento acontecendo

4. FINALIZADO
   ├─ Horário terminou
   ├─ Sistema finaliza automaticamente
   └─ Aguardando avaliações

5. CONCLUÍDO
   ├─ Avaliações feitas
   ├─ Trust score calculado
   └─ Evento arquivado

6. CANCELADO
   ├─ Anfitrião cancelou OU
   ├─ Participantes mínimos não atingidos OU
   └─ Auto-cancelamento (sistema)
```

---

## 📊 Sistema de Trust Score

**O que é**: Pontuação de confiabilidade do usuário (0-5 estrelas)

**Afeta**:
- ⬆️ **Score Alto** → Aprovação mais fácil em eventos
- ⬇️ **Score Baixo** → Pode ser rejeitado por anfitriões

**Calculado por**:
- ✅ Comparecimento (entrou com senha)
- ✅ Avaliações de outros participantes
- ✅ Eventos completados
- ❌ Cancelamentos de última hora
- ❌ No-shows (não apareceu)
- ❌ Avaliações negativas

---

## 🔔 Notificações Principais

**Usuários Recebem**:
- 📩 Novo pedido de participação (se anfitrião)
- ✅ Candidatura aprovada
- ❌ Candidatura rejeitada
- ⏰ Lembrete de evento (1 hora antes)
- 🔐 Senha do evento gerada
- 💬 Nova mensagem no chat
- ⭐ Pedido de avaliação (após evento)

**Partners Recebem**:
- 📅 Novo evento criado no restaurante
- 👥 Participantes entrando (evento institucional)
- 📊 Relatório pós-evento

---

## 🎨 Hashtags do Sistema

**Premium** (5):
- #aniversário
- #confraternização
- #churrascompiscina
- #passeiodelancha
- #cinema

**Comuns** (27):
- #happyhour, #café, #brunch, #almoco, #jantar, #drinks
- #música, #karaoke, #jogos, #esportes, #corrida
- #arte, #cultura, #cinema, #teatro, #exposição
- #networking, #negócios, #startup, #investimento
- #amizade, #romance, #family, #pets
- #vegano, #vegetariano, #saudável

---

## 💡 Recursos Importantes

### **Chat por Evento**
- Disponível apenas para participantes aprovados
- Ativo desde aprovação até evento terminar
- Auto-cleanup de eventos inativos

### **Lista de Espera**
- Se evento estiver cheio (vagas = 0)
- Usuário entra na fila
- Se alguém cancelar, primeiro da fila é notificado

### **Auto-Cancelamento**
- Se participantes mínimos não atingidos até X horas antes
- Sistema cancela automaticamente
- Todos são notificados

### **Sistema de Avaliação**
- Após evento finalizar
- Usuários avaliam uns aos outros (1-5 estrelas)
- Avaliação afeta Trust Score

---

## 🔧 Configurações que Partners Precisam Fazer

### **OBRIGATÓRIO** ⚠️:
- [ ] **Senha de Entrada** (partner_entry_password)
  - Configurar senha de 4 dígitos
  - Usada por anfitriões para validar presença
  - Pode ser alterada a qualquer momento

### **RECOMENDADO**:
- [ ] Fotos do restaurante
- [ ] Descrição completa
- [ ] Horário de funcionamento
- [ ] Capacidade máxima
- [ ] Tipo de cozinha
- [ ] Faixa de preço

---

## 📈 Métricas Principais

**Para Usuários**:
- Total de eventos participados
- Trust Score (0-5 estrelas)
- Taxa de comparecimento
- Avaliação média recebida

**Para Partners**:
- Total de eventos recebidos
- Taxa de ocupação
- Avaliação média do local
- Receita estimada gerada

---

## 🎯 Resumo por Tipo de Evento

| Tipo | Criador | Local | Aprovação | Validação |
|------|---------|-------|-----------|-----------|
| **Padrão** | Usuário | Restaurante | Manual | Dupla: Host→Restaurante, Convidados→Host |
| **Institucional** | Partner | Restaurante | Automática | Simples: Todos→Restaurante |
| **Crusher** | Premium | Restaurante (opt) | Aceite do convite | Simples: Ambos→Mesma senha |
| **Particular** | Premium | Qualquer | Manual | Simples: Todos→Mesma senha |

---

## ✅ Checklist para Começar a Usar

**Como Usuário**:
- [ ] Criar conta
- [ ] Verificar telefone
- [ ] Completar perfil
- [ ] Buscar eventos interessantes
- [ ] Candidatar-se a um evento
- [ ] Participar do primeiro evento

**Como Partner**:
- [ ] Criar conta de partner
- [ ] Completar perfil do restaurante
- [ ] **Configurar senha de entrada** ⚠️
- [ ] Criar primeiro evento institucional (se premium)
- [ ] Aguardar eventos padrão de usuários

---

## 🆘 Problemas Comuns

**"Senha do restaurante incorreta"**
→ Restaurante não configurou senha ainda
→ Solicitar que configurem no perfil

**"Você não está inscrito neste evento"**
→ Precisa se candidatar primeiro
→ Aguardar aprovação do anfitrião

**"Entrada ainda não liberada"**
→ Senha só é gerada 1 minuto antes
→ Aguardar horário do evento

**"Sua candidatura está pendente"**
→ Aguardar anfitrião aprovar
→ Pode levar algumas horas/dias

---

**Fim do Resumo** 📱
