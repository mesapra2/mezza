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