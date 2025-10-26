// src/services/ChatCleanupService.ts
import { supabase } from '../lib/supabaseClient';

/**
 * 🗑️ Serviço para limpeza automática de chats após conclusão do evento
 * Deleta mensagens após 180 dias do encerramento do evento
 */
class ChatCleanupService {
  
  /**
   * 🗑️ Limpa mensagens de eventos concluídos há 180+ dias
   */
  static async cleanupOldMessages(): Promise<{ deleted: number; error?: any }> {
    let retries = 2;
    
    while (retries > 0) {
      try {
        // 1️⃣ Buscar eventos concluídos há 180+ dias
        const now = new Date();
        const cutoffDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

        const { data: oldEvents, error: eventError } = await supabase
          .from('events')
          .select('id, status, updated_at')
          .eq('status', 'Concluído')
          .lt('updated_at', cutoffDate.toISOString());

        if (eventError) throw eventError;

        if (!oldEvents || oldEvents.length === 0) {
          console.log('✅ Nenhuma mensagem antiga para limpar');
          return { deleted: 0 };
        }

        console.log(`🗑️ Encontrados ${oldEvents.length} eventos para limpeza de mensagens`);

        // 2️⃣ Deletar mensagens destes eventos
        let totalDeleted = 0;

        for (const event of oldEvents) {
          const { data: messages, error: messagesError } = await supabase
            .from('event_messages')
            .select('id')
            .eq('event_id', event.id);

          if (messagesError) {
            console.error(`❌ Erro ao buscar mensagens do evento ${event.id}:`, messagesError);
            continue;
          }

          if (messages && messages.length > 0) {
            const messageIds = messages.map(m => m.id);
            
            // Deletar em lotes de 100 para evitar timeouts
            for (let i = 0; i < messageIds.length; i += 100) {
              const batch = messageIds.slice(i, i + 100);
              
              const { error: deleteError } = await supabase
                .from('event_messages')
                .delete()
                .in('id', batch);

              if (deleteError) {
                console.error(`❌ Erro ao deletar mensagens do evento ${event.id}:`, deleteError);
              } else {
                totalDeleted += batch.length;
                console.log(`✅ Deletadas ${batch.length} mensagens do evento ${event.id}`);
              }
            }
          }
        }

        console.log(`✅ Limpeza concluída: ${totalDeleted} mensagens deletadas`);
        return { deleted: totalDeleted };

      } catch (error) {
        retries--;
        if (retries === 0) {
          console.error('❌ Erro ao limpar mensagens antigas após 2 tentativas:', error);
          return { deleted: 0, error };
        } else {
          console.warn(`⚠️ Erro ao limpar mensagens. Tentando novamente... (${retries} tentativas restantes)`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    return { deleted: 0, error: 'Falha ao limpar mensagens' };
  }

  /**
   * ⏰ Inicia limpeza automática a cada 24 horas
   */
  static startAutoCleanup(): number {
    console.log('🕐 Iniciando limpeza automática de mensagens...');
    
    // Executar imediatamente
    this.cleanupOldMessages();

    // Executar a cada 24 horas
    const intervalId = setInterval(() => {
      console.log('🕐 Executando limpeza automática de mensagens...');
      this.cleanupOldMessages();
    }, 24 * 60 * 60 * 1000);

    return intervalId as unknown as number;
  }

  /**
   * ⏹️ Para a limpeza automática
   */
  static stopAutoCleanup(intervalId: number): void {
    if (intervalId) {
      clearInterval(intervalId);
      console.log('⏹️ Limpeza automática parada');
    }
  }

  /**
   * 🗑️ Força limpeza imediata (para testes)
   */
  static async forceCleanup(): Promise<{ deleted: number; error?: any }> {
    console.log('🔄 Forçando limpeza imediata...');
    return this.cleanupOldMessages();
  }
}

export default ChatCleanupService;