import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { MessageSquare, Loader2, AlertTriangle, Calendar, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/features/shared/components/ui/button'; // Import Button

const ChatHistoryPage = () => {
  const { user } = useAuth();
  const [chatEvents, setChatEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchChatEvents = async () => {
      if (!user) return; // Se não houver usuário, não fazer nada

      setLoading(true);
      setError(null);
      try {
        // 1. Buscar eventos onde o usuário é participante APROVADO
        const { data: participatedEventsData, error: participatedError } = await supabase
          .from('event_participants')
          .select(`
            event_id,
            event:events (
              id,
              title,
              start_time,
              status
            )
          `)
          .eq('user_id', user.id)
          .eq('status', 'aprovado');

        if (participatedError) throw participatedError;

        // 2. Buscar eventos onde o usuário é o CRIADOR
        const { data: createdEventsData, error: createdError } = await supabase
          .from('events')
          .select('id, title, start_time, status')
          .eq('creator_id', user.id);

        if (createdError) throw createdError;

        // 3. Combinar e remover duplicatas
        const allEventsMap = new Map();

        participatedEventsData.forEach(p => {
          if (p.event) { // Checa se o join funcionou
            allEventsMap.set(p.event.id, {
              id: p.event.id,
              title: p.event.title,
              start_time: p.event.start_time,
              status: p.event.status,
              role: 'Participante' // Adiciona o papel
            });
          }
        });

        createdEventsData.forEach(e => {
          // Se já existe como participante, apenas adiciona o papel 'Criador'
          if (allEventsMap.has(e.id)) {
            const existing = allEventsMap.get(e.id);
            existing.role = 'Criador & Participante'; // Ou apenas 'Criador' se preferir
          } else {
            // Se não existe, adiciona como criador
            allEventsMap.set(e.id, {
              id: e.id,
              title: e.title,
              start_time: e.start_time,
              status: e.status,
              role: 'Criador'
            });
          }
        });

        // 4. Converter o Map para Array e ordenar por data (mais recente primeiro)
        const combinedEvents = Array.from(allEventsMap.values())
          .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

        setChatEvents(combinedEvents);

      } catch (err) {
        console.error("Erro ao buscar histórico de chats:", err);
        setError("Não foi possível carregar o histórico de chats.");
      } finally {
        setLoading(false);
      }
    };

    fetchChatEvents();
  }, [user]); // Depende do 'user'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-10rem)]">
        <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
        <p className="ml-3 text-white/70">Carregando seus chats...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">{error}</h2>
        {/* Adicionado botão para tentar novamente */}
        <Button onClick={() => window.location.reload()}> 
          Tentar Novamente
        </Button>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Meus Chats - Mesapra2</title>
      </Helmet>
      <div className="py-6 px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-white mb-6">Meus Chats</h1>

        {chatEvents.length === 0 ? (
          <div className="glass-effect rounded-2xl p-12 border border-white/10 text-center">
            <MessageSquare className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <p className="text-white/60 text-lg mb-4">
              Nenhum chat encontrado
            </p>
            <p className="text-white/40 text-sm">
              Participe ou crie eventos para começar a conversar!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {chatEvents.map(event => (
              <Link key={event.id} to={`/event/${event.id}/chat`}>
                <div className="glass-effect rounded-lg p-4 border border-white/10 hover:border-purple-500/50 transition-colors cursor-pointer">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-lg font-semibold text-white mb-1">{event.title}</h2>
                      <div className="flex items-center gap-4 text-xs text-white/60">
                         <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3"/>
                            {format(new Date(event.start_time), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                         </span>
                         <span className="flex items-center gap-1">
                             <Users className="w-3 h-3"/>
                             {event.role} {/* Mostra se é Criador ou Participante */}
                         </span>
                      </div>
                    </div>
                     {/* Badge de Status (Opcional) */}
                     <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                          event.status === 'Cancelado' ? 'border-red-500/30 text-red-300'
                        : ['Finalizado', 'Concluído'].includes(event.status) ? 'border-gray-500/30 text-gray-300'
                        : 'border-green-500/30 text-green-300'
                     }`}>
                       {event.status}
                     </span>
                  </div>
                   {/* Futuramente: Adicionar última mensagem ou indicador de não lidas aqui */}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default ChatHistoryPage;