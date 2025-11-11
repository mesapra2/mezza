// src/services/TrustScoreService.ts
import { supabase } from '../lib/supabaseClient';

interface TrustScoreResult {
  success: boolean;
  data?: any;
  error?: any;
}

// ✅ Interface 'UserTrustStatus' removida daqui (Correção TS6196)

/**
 * ⭐ Serviço de Ranking de Confiabilidade
 * Gerencia trust score (5-0) e banimentos
 * Regra: Não compareceu = -1 score, quando chega em 0 = banido
 */
class TrustScoreService {
  /**
   * 🎯 Obtém trust score do usuário
   * @param userId - ID do usuário
   */
  static async getTrustScore(userId: string): Promise<TrustScoreResult> {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('trust_score, is_banned')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { success: false, error: 'Usuário não encontrado' };
        }
        throw error;
      }

      return {
        success: true,
        data: {
          trustScore: profile?.trust_score || 5,
          isBanned: profile?.is_banned || false
        }
      };
    } catch (error) {
      console.error('❌ Erro ao obter trust score:', error);
      return { success: false, error };
    }
  }

  /**
   * 🚫 Verifica se usuário está banido
   * @param userId - ID do usuário
   */
  static async isBanned(userId: string): Promise<boolean> {
    try {
      const result = await this.getTrustScore(userId);
      if (!result.success) return false;
      return result.data?.isBanned === true;
    } catch (error) {
      console.error('❌ Erro ao verificar banimento:', error);
      return false;
    }
  }

  /**
   * ⬇️ Reduz trust score (não compareceu)
   * @param userId - ID do usuário
   */
  static async penalizeNoShow(userId: string): Promise<TrustScoreResult> {
    try {
      const { data: profile, error: getError } = await supabase
        .from('profiles')
        .select('trust_score')
        .eq('id', userId)
        .single();

      if (getError) throw getError;

      const currentScore = profile?.trust_score || 5;
      const newScore = Math.max(0, currentScore - 1); // Mínimo 0

      console.log(`⬇️ Penalizando ${userId}: ${currentScore} → ${newScore}`);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          trust_score: newScore,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      // 🚫 Se score chegou em 0, banir automaticamente
      if (newScore === 0) {
        await this.banUser(userId, 'Trust score atingiu 0');
      }

      // 📊 Registrar penalidade
      await this.logTrustScoreChange(userId, currentScore, newScore, 'no_show');

      console.log(`✅ Penalidade aplicada: ${userId} agora tem score ${newScore}`);

      return {
        success: true,
        data: {
          previousScore: currentScore,
          newScore,
          wasBanned: newScore === 0
        }
      };
    } catch (error) {
      console.error('❌ Erro ao penalizar usuário:', error);
      return { success: false, error };
    }
  }

  /**
   * 🚫 Bani um usuário (trust_score = 0)
   * @param userId - ID do usuário
   * @param reason - Motivo do banimento
   */
  static async banUser(userId: string, reason: string = 'Trust score zerado'): Promise<TrustScoreResult> {
    try {
      console.log(`🚫 Banindo usuário ${userId}: ${reason}`);

      const { error } = await supabase
        .from('profiles')
        .update({
          is_banned: true,
          trust_score: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      // 📊 Registrar banimento
      await this.logBanishment(userId, reason);

      console.log(`✅ Usuário ${userId} foi banido`);

      return { success: true, data: { userId, reason } };
    } catch (error) {
      console.error('❌ Erro ao banir usuário:', error);
      return { success: false, error };
    }
  }

  /**
   * 💰 Desbloqueia usuário após pagamento (trust_score = 5 novamente)
   * @param userId - ID do usuário
   * @param paymentId - ID da transação Stripe/Mercado Pago
   */
  static async unbanUserAfterPayment(
    userId: string,
    paymentId: string
  ): Promise<TrustScoreResult> {
    try {
      console.log(`💚 Desbloqueando usuário ${userId} após pagamento`);

      // 1️⃣ Resetar score para 5 e desbanir
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          trust_score: 5, // Volta para o máximo
          is_banned: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      // 2️⃣ Registrar desbloqueio no payments table
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id: userId,
          amount: 249.00,
          reason: 'unban_trust_score',
          status: 'completed',
          stripe_payment_id: paymentId,
          created_at: new Date().toISOString()
        });

      if (paymentError) {
        console.warn('⚠️ Erro ao registrar pagamento (não é crítico):', paymentError);
        // Não falhar - usuário já foi desbloqueado
      }

      // 3️⃣ Registrar no log
      await this.logUnbanishment(userId, paymentId);

      console.log(`✅ Usuário ${userId} foi desbloqueado. Score resetado para 5.`);

      return {
        success: true,
        data: {
          userId,
          newScore: 5,
          message: 'Perfil desbloqueado com sucesso!'
        }
      };
    } catch (error) {
      console.error('❌ Erro ao desbloquear usuário:', error);
      return { success: false, error };
    }
  }

  /**
   * 📊 Penaliza não-presença de participantes (chamar quando evento termina)
   * @param eventId - ID do evento
   */
  static async penalizeNoShowsForEvent(eventId: number): Promise<TrustScoreResult> {
    try {
      console.log(`📊 Processando penalidades de não-presença para evento ${eventId}`);

      // 1️⃣ Buscar participações de aprovados SEM acesso (não compareceu)
      const { data: noShows, error: queryError } = await supabase
        .from('event_participants')
        .select('id, user_id')
        .eq('event_id', eventId)
        .eq('status', 'aprovado')
        .eq('presenca_confirmada', true) // Confirmou presença
        .eq('com_acesso', false); // Mas não entrou

      if (queryError) throw queryError;

      if (!noShows || noShows.length === 0) {
        console.log(`✅ Nenhuma não-presença para penalizar no evento ${eventId}`);
        return { success: true, data: { penalized: 0 } };
      }

      console.log(`⚠️ Encontradas ${noShows.length} não-presenças`);

      // 2️⃣ Penalizar cada um
      let penalizedCount = 0;
      const errors: any[] = [];

      for (const noShow of noShows) {
        try {
          const result = await this.penalizeNoShow(noShow.user_id);
          if (result.success) {
            penalizedCount++;
          } else {
            errors.push({ userId: noShow.user_id, error: result.error });
          }
        } catch (error) {
          errors.push({ userId: noShow.user_id, error });
        }
      }

      console.log(`✅ Penalizadas ${penalizedCount}/${noShows.length} não-presenças`);

      return {
        success: true,
        data: {
          eventId,
          penalized: penalizedCount,
          errors: errors.length > 0 ? errors : undefined
        }
      };
    } catch (error) {
      console.error('❌ Erro ao penalizar no-shows:', error);
      return { success: false, error };
    }
  }

  /**
   * 📈 Restaura trust score manualmente (admin)
   * @param userId - ID do usuário
   * @param newScore - Novo score (0-5)
   */
  static async setTrustScoreManual(userId: string, newScore: number): Promise<TrustScoreResult> {
    try {
      if (newScore < 0 || newScore > 5) {
        return { success: false, error: 'Score deve estar entre 0 e 5' };
      }

      console.log(`🔧 Ajustando score de ${userId} para ${newScore} (manual)`);

      const { error } = await supabase
        .from('profiles')
        .update({
          trust_score: newScore,
          is_banned: newScore === 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      console.log(`✅ Score ajustado manualmente`);

      return { success: true, data: { userId, newScore } };
    } catch (error) {
      console.error('❌ Erro ao ajustar score:', error);
      return { success: false, error };
    }
  }

  /**
   * 📊 Obtém relatório de confiabilidade do usuário
   */
  static async getTrustReport(userId: string): Promise<TrustScoreResult> {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('trust_score, is_banned, created_at')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      // Buscar histórico de mudanças
      const { data: history, error: historyError } = await supabase
        .from('trust_score_changes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (historyError) {
        console.warn('⚠️ Erro ao buscar histórico:', historyError);
      }

      return {
        success: true,
        data: {
          userId,
          currentScore: profile?.trust_score,
          isBanned: profile?.is_banned,
          memberSince: profile?.created_at,
          scoreHistory: history || []
        }
      };
    } catch (error) {
      console.error('❌ Erro ao obter relatório:', error);
      return { success: false, error };
    }
  }

  /**
   * 📝 Registra mudança de score (log)
   */
  private static async logTrustScoreChange(
    userId: string,
    previousScore: number,
    newScore: number,
    reason: string
  ): Promise<void> {
    try {
      await supabase.from('trust_score_changes').insert({
        user_id: userId,
        previous_score: previousScore,
        new_score: newScore,
        reason,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.warn('⚠️ Erro ao registrar mudança de score:', error);
    }
  }

  /**
   * 📝 Registra banimento (log)
   */
  private static async logBanishment(userId: string, reason: string): Promise<void> {
    try {
      await supabase.from('banishment_logs').insert({
        user_id: userId,
        reason,
        banned_at: new Date().toISOString()
      });
    } catch (error) {
      console.warn('⚠️ Erro ao registrar banimento:', error);
    }
  }

  /**
   * 📝 Registra desbloqueio (log)
   */
  private static async logUnbanishment(userId: string, paymentId: string): Promise<void> {
    try {
      await supabase.from('unbanishment_logs').insert({
        user_id: userId,
        payment_id: paymentId,
        unbanned_at: new Date().toISOString()
      });
    } catch (error) {
      console.warn('⚠️ Erro ao registrar desbloqueio:', error);
    }
  }
}

export default TrustScoreService;

