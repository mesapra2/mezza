┌─────────────────────┐
│  Evento começa      │
│  (Em Andamento)     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Evento termina     │
│  (Finalizado)       │
└──────────┬──────────┘
           │
      ┌────┴──────────────────────────┐
      │                               │
      ▼                               ▼
┌──────────────────┐      ┌────────────────────────┐
│ 7 dias passaram? │      │ Todos avaliaram TUDO?  │
│   SIM → Conclui  │      │ SIM → Conclui          │
└──────────────────┘      └────────────────────────┘
      │
      ▼
┌─────────────────────┐
│  Evento Concluído   │
│  - Chat read-only   │
│  - Pode criar novo  │
└──────────────────────┘
      │
      ▼
┌─────────────────────┐
│  Após 180 dias      │
│  - Deleta mensagens │
└─────────────────────┘



🎯 Status do Evento
StatusDescriçãoAções DisponíveisAbertoEvento aberto para candidaturasInscrever-seConfirmadoConfirmado, aguardando inícioVisualizarEm AndamentoEvento está acontecendoParticipar do chatFinalizadoEncerrado, aguardando avaliaçõesAvaliar + ChatConcluídoEvento finalizado, avaliações completasChat read-onlyCanceladoEvento canceladoN/A

🔄 Fluxo Detalhado
1️⃣ Evento Termina (end_time)
javascriptEventStatusService.updateAllEventStatuses()
    ↓
Checa: now >= end_time
    ↓
Status: FINALIZADO
    ↓
Chat continua aberto
Botões aparecem para avaliar:
  - Anfitrião ⭐
  - Participantes ⭐
  - Restaurante 🍽️

2️⃣ Processo de Avaliação (OBRIGATÓRIO PARA CONCLUIR)
A. Estrutura de Avaliações
typescripttype RatingType = 'host' | 'participant' | 'restaurant';

interface Rating {
  event_id: number;
  rater_id: string;      // Quem está avaliando
  rated_id: string;      // Quem está sendo avaliado
  rating_type: RatingType;
  score: number;         // 1-5 ⭐
  created_at: Date;
}
B. Obrigações por Tipo de Evento
EVENTO CONCLUÍDO quando:

✅ Todos os participantes que compareceram (presenca_confirmada = true):
   1. Avaliaram o ANFITRIÃO (rating_type = 'host')
   2. Avaliaram os PARTICIPANTES (rating_type = 'participant')
   3. Avaliaram o RESTAURANTE (rating_type = 'restaurant')
   
   + avaliacao_feita = true para a participação
C. Fluxo de Avaliação
Usuario clica em "Avaliar Restaurante"
    ↓
RatingService.createRating({
  eventId: 23,
  raterId: 'user-123',
  ratedId: 'restaurant-456',  // partner_id do evento
  ratingType: 'restaurant',
  score: 5
})
    ↓
updateParticipationEvaluationFlag()
    ↓
Verifica se TODAS as avaliações foram feitas:
  - hasHostRating?
  - hasParticipantRatings?
  - hasRestaurantRating?
    ↓
Se SIM em TUDO: avaliacao_feita = true

3️⃣ Auto-Conclusão do Evento
A. Verificação Automática (a cada 60 segundos)
javascriptEventStatusService.updateAllEventStatuses()
    ↓
Para cada evento em FINALIZADO:
  calculateEventStatus(event)
    ↓
  shouldAutoCompleteEvent(event)
    ↓
  Verifica 2 condições:
    1. Passou 7 dias desde end_time? → CONCLUÍDO
    2. Todos que compareceram avaliaram TUDO? → CONCLUÍDO
B. Verificação de Avaliações Completas
typescript// RatingService.getEventRatingsStatus()
pendingRaters = participantes.filter(p => {
  const raterRatings = ratings.filter(r => r.rater_id === p.user_id);
  return (
    !raterRatings.some(r => r.rating_type === 'host') ||
    !raterRatings.some(r => r.rating_type === 'participant') ||
    !raterRatings.some(r => r.rating_type === 'restaurant')
  );
});

allRatingsComplete = pendingRaters.length === 0;

4️⃣ Transição para CONCLUÍDO
javascriptshouldAutoCompleteEvent() {
  // Condição 1: Passou 7 dias?
  if (daysSinceEnd >= 7) {
    return true;  // ✅ CONCLUÍDO automaticamente
  }
  
  // Condição 2: Todos avaliaram TUDO?
  const presentParticipants = participations
    .filter(p => p.presenca_confirmada === true);
  
  const allEvaluated = presentParticipants
    .every(p => p.avaliacao_feita === true);
  
  if (allEvaluated && presentParticipants.length > 0) {
    return true;  // ✅ CONCLUÍDO imediatamente
  }
  
  return false;  // ⏳ Ainda aguardando
}

5️⃣ Chat em Read-Only
Quando evento está CONCLUÍDO:
javascript// EventChatPage.jsx
const [eventStatus, setEventStatus] = useState('');

// Bloqueia envio de mensagens
const handleSubmit = (e) => {
  if (eventStatus === 'Concluído') {
    alert('Este evento foi concluído. O chat está em modo leitura.');
    return;
  }
  // ... enviar mensagem
};

// UI mostra aviso
{eventStatus === 'Concluído' && (
  <div className="p-2 rounded-lg bg-gray-700/50">
    🔒 Evento concluído - Chat em modo leitura
  </div>
)}

// Input desabilitado
<Input disabled={eventStatus === 'Concluído'} />

6️⃣ Validação: Máximo 1 Evento por Dia
typescriptParticipationService.canUserCreateNewEvent(userId)
    ↓
1. Verifica se há eventos não concluídos:
   SELECT * FROM events
   WHERE creator_id = userId
   AND status != 'Concluído'
   
   Se houver: ❌ BLOQUEADO
   
2. Verifica limite diário:
   SELECT COUNT(*) FROM events
   WHERE creator_id = userId
   AND DATE(created_at) = TODAY()
   
   Se >= 1: ❌ BLOQUEADO (volta amanhã)
   
Resultado: { can: boolean, reason?: string }
Uso no componente:
javascriptconst permission = await ParticipationService.canUserCreateNewEvent(user.id);

if (!permission.can) {
  toast({
    variant: 'destructive',
    title: 'Não pode criar evento',
    description: permission.reason
  });
  return;
}

// ... criar evento

7️⃣ Limpeza Automática (180 dias)
typescript// ChatCleanupService.ts
ChatCleanupService.startAutoCleanup()
    ↓
Executa a cada 24 horas:
  1. Busca eventos CONCLUÍDO há 180+ dias
  2. Deleta todas as mensagens deles
  3. Libera espaço no BD
Método:
typescript// Buscar eventos para limpar
const oldEvents = await supabase
  .from('events')
  .select('id')
  .eq('status', 'Concluído')
  .lt('updated_at', cutoffDate)  // 180 dias atrás

// Deletar mensagens em lotes
for (const event of oldEvents) {
  await supabase
    .from('event_messages')
    .delete()
    .eq('event_id', event.id);
}

🔒 RatingService Estendido
A. Novo tipo suportado
typescriptexport type RatingType = 'host' | 'participant' | 'restaurant';
B. Novo método
typescript// Verifica status completo de avaliações
getEventRatingsStatus(eventId)
    ↓
Retorna:
{
  totalParticipants: 5,
  hostRatingsReceived: 3,
  participantRatingsReceived: 4,
  restaurantRatingsReceived: 2,
  allRatingsComplete: false,
  pendingRaters: [
    {
      user_id: 'user-123',
      username: 'João',
      evaluated_host: true,
      evaluated_participants: true,
      evaluated_restaurant: false  // ⚠️ Falta avaliar restaurante
    }
  ]
}
C. Flag atualizado
typescriptupdateParticipationEvaluationFlag()
    ↓
ANTES: Marcava avaliacao_feita se tinha rating_type = 'host'
AGORA: Marca avaliacao_feita APENAS se:
  ✅ hasHostRating = true
  ✅ hasParticipantRatings = true
  ✅ hasRestaurantRating = true
  
Senão continua com avaliacao_feita = false

🔄 ParticipationService Estendido
Novo Método
typescript// Verifica se usuário pode criar novo evento
canUserCreateNewEvent(userId): Promise<{can: boolean, reason?: string}>
    ↓
Regras:
1. Não pode ter eventos não concluídos
   - Se tiver: "Você tem eventos aguardando conclusão"
   
2. Máximo 1 evento por dia
   - Se atingiu: "Você já criou um evento hoje"
   
3. Senão: Permitido
   - { can: true }

🧹 ChatCleanupService (NOVO)
Responsabilidades

✅ Deleta mensagens de eventos concluídos há 180+ dias
✅ Executa automaticamente a cada 24 horas
✅ Deleta em lotes de 100 para evitar timeouts
✅ Oferece método de força imediata para testes

Inicialização
javascript// No App.jsx ou main.jsx
import ChatCleanupService from '@/services/ChatCleanupService';

useEffect(() => {
  const cleanupInterval = ChatCleanupService.startAutoCleanup();
  
  return () => {
    ChatCleanupService.stopAutoCleanup(cleanupInterval);
  };
}, []);

🔍 Arquivo: EventStatusService.ts
Função corrigida:
typescriptshouldAutoCompleteEvent(event)
    ↓
Regras para AUTO-CONCLUSÃO:
1. Passou 7 dias desde end_time? → true
2. Ninguém compareceu? → false (aguarda 7 dias)
3. Alguém compareceu mas ninguém avaliou? → false
4. TODOS que compareceram avaliaram TUDO? → true
5. Senão → false (aguardando)

# 🎯 GUIA DE IMPLEMENTAÇÃO - FLUXO DE CONCLUSÃO DE EVENTOS

## 📦 ARQUIVOS CRIADOS

### 1. **MyEventsPage.jsx** 
**Localização:** `src/features/shared/pages/MyEventsPage.jsx`

**Função:** Página "Meus Eventos" com 4 abas:
- Futuros: eventos que ainda não aconteceram
- Passados: eventos que terminaram mas não estão em Finalizado/Concluído
- **Finalizados:** eventos terminados aguardando avaliação (botão QUALIFICAR aqui)
- Concluídos: eventos completamente finalizados

**Características:**
- Botão "Qualificar" aparece APENAS em eventos Finalizados para quem compareceu
- Botão "Trocar Foto" aparece em Concluídos (se < 6 meses)
- Indicador visual se já avaliou ou não
- Links para ver detalhes ou editar eventos

---

### 2. **EventDetails.jsx** (Corrigido)
**Localização:** `src/features/shared/pages/EventDetails.jsx`

**Correções aplicadas:**
1. **Separação de lógica Finalizado vs Concluído:**
   - `isEventFinalized`: status === 'Finalizado'
   - `isEventConcluded`: status === 'Concluído'

2. **Fluxo de avaliação → foto:**
   ```jsx
   // Em FINALIZADO:
   if (!hasEvaluated) {
     // Mostra EventEvaluationSection
   } else {
     // Mostra botão de enviar foto
   }
   
   // Em CONCLUÍDO:
   // Mostra apenas botão de trocar foto (se < 6 meses)
   ```

3. **Validação de upload:**
   - Não pode enviar foto antes de avaliar em "Finalizado"
   - Em "Concluído" pode trocar foto por até 6 meses

---

### 3. **ParticipantHistoryPage.jsx**
**Localização:** `src/features/shared/pages/ParticipantHistoryPage.jsx`

**Função:** Histórico de fotos do participante

**Características:**
- Grid com todas as fotos enviadas pelo usuário
- Informações do evento de cada foto
- Botão para ver evento
- Botão para trocar foto (se evento concluído < 6 meses)
- Botão para deletar foto
- Contador de fotos publicadas

---

### 4. **RestaurantDetailsPage.jsx**
**Localização:** `src/features/shared/pages/RestaurantDetailsPage.jsx`

**Função:** Página de detalhes do restaurante com carousel de fotos

**Características:**
- Carousel com até 50 fotos dos eventos do restaurante
- Fotos são exibidas em ordem cronológica reversa (mais recentes primeiro)
- Navegação com setas esquerda/direita
- Thumbnails clicáveis abaixo do carousel
- Informações de quem postou e data
- Lista de próximos eventos do restaurante

**Lógica do Carousel:**
```javascript
// Busca fotos aprovadas de todos os eventos
// Filtra apenas as do partner_id específico
// Limita a 50 fotos (FIFO - mais antigas saem)
// Ordena por created_at DESC
```

---

## 🔧 INTEGRAÇÃO NO PROJETO

### Passo 1: Copiar arquivos para o projeto

```bash
# Copiar arquivos da pasta /home/claude/ para o projeto
cp /home/claude/MyEventsPage.jsx src/features/shared/pages/
cp /home/claude/EventDetails.jsx src/features/shared/pages/
cp /home/claude/ParticipantHistoryPage.jsx src/features/shared/pages/
cp /home/claude/RestaurantDetailsPage.jsx src/features/shared/pages/
```

### Passo 2: Adicionar rotas

**Arquivo:** `src/App.jsx` ou `src/router.jsx`

```jsx
import MyEventsPage from '@/features/shared/pages/MyEventsPage';
import ParticipantHistoryPage from '@/features/shared/pages/ParticipantHistoryPage';
import RestaurantDetailsPage from '@/features/shared/pages/RestaurantDetailsPage';

// Adicionar rotas:
<Route path="/meus-eventos" element={<MyEventsPage />} />
<Route path="/meu-historico" element={<ParticipantHistoryPage />} />
<Route path="/restaurant/:id" element={<RestaurantDetailsPage />} />
```

### Passo 3: Atualizar RestaurantsPage.jsx

**Trocar o Link do card:**

```jsx
// ANTES:
<Link to={`/restaurant/${restaurant.id}`}>

// Já está correto! Apenas certifique-se de que aponta para a rota certa
```

### Passo 4: Atualizar navegação/menu

Adicionar links no menu principal:

```jsx
<NavLink to="/meus-eventos">Meus Eventos</NavLink>
<NavLink to="/meu-historico">Minhas Fotos</NavLink>
```

---

## 📊 FLUXO COMPLETO

### Status dos Eventos:

```
1. ABERTO → Aceitando candidaturas
2. CONFIRMADO → Evento confirmado, pode entrar com senha
3. EM ANDAMENTO → Acontecendo agora
4. FINALIZADO → Terminou, aguardando avaliações
   ├─ Participante que compareceu vê botão QUALIFICAR
   ├─ Após avaliar: aparece botão ENVIAR FOTO
   └─ Quando todos avaliarem OU passar 7 dias → CONCLUÍDO
   
5. CONCLUÍDO → Evento finalizado
   └─ Pode TROCAR FOTO por até 6 meses
```

### Fluxo de Avaliação:

```
EVENTO FINALIZADO
    ↓
Participante clica em QUALIFICAR
    ↓
Vai para EventDetails
    ↓
Vê seção EventEvaluationSection
    ↓
Avalia: Anfitrião + Participantes + Restaurante
    ↓
avaliacao_feita = true
    ↓
Aparece botão ENVIAR FOTO
    ↓
Upload da foto
    ↓
Foto vai para:
  - event_photos (tabela)
  - Histórico do participante
  - Carousel do restaurante
```

### Fluxo de Fotos:

```
FOTO ENVIADA
    ↓
Salva em event_photos
    ├─ event_id
    ├─ user_id
    ├─ photo_url (Supabase Storage: event-photos bucket)
    └─ status: 'aprovado'
    ↓
Aparece em:
    ├─ Histórico do Participante (/meu-historico)
    └─ Carousel do Restaurante (/restaurant/:id)
         └─ Filtrado por partner_id
         └─ Últimas 50 fotos (FIFO)
```

---

## ✅ CHECKLIST DE VALIDAÇÕES

### No EventDetails.jsx:
- [x] Separa lógica Finalizado vs Concluído
- [x] Mostra avaliação ANTES do botão de foto
- [x] Só libera foto após `avaliacao_feita = true`
- [x] Em Concluído, permite trocar foto por 6 meses
- [x] Usa `differenceInMonths` para validar prazo

### No MyEventsPage.jsx:
- [x] Aba "Finalizados" filtra por `status === 'Finalizado'` + `presenca_confirmada === true`
- [x] Botão "Qualificar" aparece só se `!hasEvaluated`
- [x] Botão "Trocar Foto" em Concluídos se < 6 meses
- [x] Indicador visual de status de avaliação

### No ParticipantHistoryPage.jsx:
- [x] Busca fotos do usuário logado
- [x] Mostra evento de cada foto
- [x] Permite deletar foto própria
- [x] Permite trocar foto em eventos concluídos < 6 meses

### No RestaurantDetailsPage.jsx:
- [x] Carousel com últimas 50 fotos
- [x] Filtra por `partner_id`
- [x] Navegação esquerda/direita
- [x] Thumbnails
- [x] Info de quem postou

---

## 🔍 SERVIÇOS UTILIZADOS

### RatingService.ts
```typescript
// Já funciona corretamente
- createRating()
- updateParticipationEvaluationFlag() // Marca avaliacao_feita = true
- getEventRatingsStatus()
```

### EventPhotosService.ts
```typescript
// Já funciona corretamente
- uploadEventPhoto() // Upload com redimensionamento
- getEventPhotos() // Busca fotos de um evento
- getUserPhotoForEvent() // Busca foto do user em evento específico
- deleteEventPhoto() // Deleta foto
- getPhotoStats() // Estatísticas
```

### EventStatusService.ts
```typescript
// Auto-conclusão funciona
- shouldAutoCompleteEvent()
  ├─ Verifica se passou 7 dias
  └─ Verifica se todos que compareceram avaliaram
```

---

## 📸 ESTRUTURA NO SUPABASE

### Tabela: event_photos
```sql
- id (int, PK)
- event_id (int, FK → events)
- user_id (uuid, FK → users)
- photo_url (text) -- URL do Supabase Storage
- file_size (int)
- status (text) -- 'aprovado', 'pendente', 'rejeitado'
- created_at (timestamp)
```

### Bucket: event-photos
```
Estrutura:
event-photos/
  ├─ 123/
  │   ├─ user1-1698765432.jpg
  │   └─ user2-1698765433.jpg
  └─ 124/
      └─ user3-1698765434.jpg
```

---

## 🎨 ESTILOS E COMPONENTES

Todos os arquivos usam:
- **Tailwind CSS** para estilização
- **Framer Motion** para animações
- **Lucide React** para ícones
- **shadcn/ui** componentes (Button, Input)
- **date-fns** para formatação de datas
- Classes: `glass-effect`, `gradient-text`

---

## 🚀 PRÓXIMOS PASSOS

1. ✅ Copiar arquivos para o projeto
2. ✅ Adicionar rotas
3. ✅ Atualizar menu de navegação
4. ✅ Testar fluxo completo:
   - Criar evento
   - Participar
   - Entrar com senha
   - Evento finalizar
   - Avaliar (qualificar)
   - Enviar foto
   - Ver foto no histórico
   - Ver foto no carousel do restaurante

---

## 💡 OBSERVAÇÕES IMPORTANTES

### Timing de Auto-conclusão:
```javascript
// Em EventStatusService.ts
shouldAutoCompleteEvent() {
  // Condição 1: Passou 7 dias?
  if (daysSinceEnd >= 7) return true;
  
  // Condição 2: Todos que compareceram avaliaram?
  if (allEvaluated) return true;
  
  return false;
}
```

### Prazo de Troca de Foto:
```javascript
// Em todos os componentes
const canChangePhoto = () => {
  if (status !== 'Concluído') return false;
  const monthsSinceEnd = differenceInMonths(new Date(), eventEndTime);
  return monthsSinceEnd < 6;
};
```

### FIFO de Fotos (50 max):
```javascript
// No SQL do Supabase
.order('created_at', { ascending: false })
.limit(50)
// Fotos mais antigas automaticamente deixam de aparecer
```

---

## 🐛 DEBUGGING

### Se botão "Qualificar" não aparecer:
1. Verificar status do evento: deve ser 'Finalizado'
2. Verificar presenca_confirmada: deve ser `true`
3. Verificar avaliacao_feita: deve ser `false`

### Se não consegue enviar foto:
1. Verificar se avaliou tudo (avaliacao_feita = true)
2. Verificar bucket 'event-photos' no Supabase Storage
3. Verificar políticas RLS da tabela event_photos

### Se foto não aparece no carousel:
1. Verificar se photo.event.partner_id === restaurant.id
2. Verificar se foto tem status 'aprovado'
3. Verificar query no RestaurantDetailsPage

---

## ✨ FIM DO GUIA

Todos os arquivos estão prontos e seguem as melhores práticas do React/Next.js.
O fluxo está completo e testável.

Dúvidas? Revise as seções específicas acima! 🚀