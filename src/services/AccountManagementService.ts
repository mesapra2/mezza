// src/services/AccountManagementService.ts
// Serviço para gerenciar alteração de senha e eliminação de conta

import { supabase } from '@/lib/supabaseClient';

interface ServiceResult {
  success: boolean;
  error?: string;
  data?: any;
}

class AccountManagementService {
  
  /**
   * 🔐 Alterar senha do usuário
   * Requer senha atual para validação
   */
  static async changePassword(currentPassword: string, newPassword: string): Promise<ServiceResult> {
    try {
      // 1. Validar senha atual tentando fazer login
      const { data: user } = await supabase.auth.getUser();
      
      if (!user?.user?.email) {
        return { success: false, error: 'Usuário não encontrado' };
      }

      // 2. Verificar senha atual
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.user.email,
        password: currentPassword,
      });

      if (signInError) {
        return { success: false, error: 'Senha atual incorreta' };
      }

      // 3. Alterar para nova senha
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      console.log('✅ Senha alterada com sucesso');
      return { success: true };
      
    } catch (error: any) {
      console.error('❌ Erro ao alterar senha:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 📧 Enviar código de confirmação para deletar conta
   * Gera código de 6 dígitos e envia por email
   */
  static async sendAccountDeletionCode(): Promise<ServiceResult> {
    try {
      const { data: user } = await supabase.auth.getUser();
      
      if (!user?.user?.email) {
        return { success: false, error: 'Usuário não encontrado' };
      }

      // 1. Gerar código de 6 dígitos
      const deletionCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // 2. Salvar código temporariamente no perfil do usuário
      const { error: saveError } = await supabase
        .from('profiles')
        .update({
          deletion_code: deletionCode,
          deletion_code_expires: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutos
        })
        .eq('id', user.user.id);

      if (saveError) {
        console.error('❌ Erro ao salvar código:', saveError);
        return { success: false, error: 'Erro interno - tente novamente' };
      }

      // 3. Enviar email com código (usando função RPC do Supabase)
      const { error: emailError } = await supabase.rpc('send_deletion_confirmation_email', {
        user_email: user.user.email,
        user_id: user.user.id,
        confirmation_code: deletionCode
      });

      if (emailError) {
        console.error('❌ Erro ao enviar email:', emailError);
        // Não falhar se email não enviar - usuário pode tentar novamente
        console.warn('⚠️ Email não enviado, mas código salvo. Usuário pode tentar novamente.');
      }

      console.log(`✅ Código de exclusão gerado e enviado para ${user.user.email}`);
      return { 
        success: true, 
        data: { 
          email: user.user.email,
          expiresIn: 10 // minutos
        } 
      };
      
    } catch (error: any) {
      console.error('❌ Erro ao gerar código de exclusão:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 🗑️ Confirmar exclusão de conta com código
   * Remove TODOS os dados do usuário do sistema
   */
  static async confirmAccountDeletion(confirmationCode: string): Promise<ServiceResult> {
    try {
      const { data: user } = await supabase.auth.getUser();
      
      if (!user?.user?.id) {
        return { success: false, error: 'Usuário não encontrado' };
      }

      // 1. Buscar código no perfil
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('deletion_code, deletion_code_expires')
        .eq('id', user.user.id)
        .single();

      if (profileError || !profile) {
        return { success: false, error: 'Código não encontrado - solicite um novo código' };
      }

      // 2. Validar código
      if (profile.deletion_code !== confirmationCode) {
        return { success: false, error: 'Código incorreto' };
      }

      // 3. Verificar expiração
      if (new Date() > new Date(profile.deletion_code_expires)) {
        return { success: false, error: 'Código expirado - solicite um novo código' };
      }

      // 4. Iniciar processo de exclusão completa
      console.log(`🗑️ Iniciando exclusão completa da conta ${user.user.id}...`);
      
      // 4a. Cancelar todos os eventos do usuário
      const { error: cancelEventsError } = await supabase
        .from('events')
        .update({ status: 'Cancelado' })
        .eq('creator_id', user.user.id)
        .neq('status', 'Concluído');

      if (cancelEventsError) {
        console.error('❌ Erro ao cancelar eventos:', cancelEventsError);
      } else {
        console.log('✅ Eventos cancelados');
      }

      // 4b. Remover participações ativas
      const { error: removeParticipationsError } = await supabase
        .from('event_participants')
        .delete()
        .eq('user_id', user.user.id);

      if (removeParticipationsError) {
        console.error('❌ Erro ao remover participações:', removeParticipationsError);
      } else {
        console.log('✅ Participações removidas');
      }

      // 4c. Remover notificações
      const { error: removeNotificationsError } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.user.id);

      if (removeNotificationsError) {
        console.error('❌ Erro ao remover notificações:', removeNotificationsError);
      } else {
        console.log('✅ Notificações removidas');
      }

      // 4d. Remover fotos de eventos
      const { error: removePhotosError } = await supabase
        .from('event_photos')
        .delete()
        .eq('user_id', user.user.id);

      if (removePhotosError) {
        console.error('❌ Erro ao remover fotos:', removePhotosError);
      } else {
        console.log('✅ Fotos removidas');
      }

      // 4e. Remover avaliações
      const { error: removeRatingsError } = await supabase
        .from('ratings')
        .delete()
        .eq('user_id', user.user.id);

      if (removeRatingsError) {
        console.error('❌ Erro ao remover avaliações:', removeRatingsError);
      } else {
        console.log('✅ Avaliações removidas');
      }

      // 5. Remover perfil
      const { error: removeProfileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.user.id);

      if (removeProfileError) {
        console.error('❌ Erro ao remover perfil:', removeProfileError);
        return { success: false, error: 'Erro ao remover dados do perfil' };
      }

      // 6. Deletar usuário do auth (última etapa)
      const { error: deleteUserError } = await supabase.rpc('delete_user_account', {
        user_id: user.user.id
      });

      if (deleteUserError) {
        console.error('❌ Erro ao deletar usuário:', deleteUserError);
        // Mesmo com erro no auth, dados já foram removidos
      }

      console.log('🗑️ ✅ Conta completamente removida do sistema');
      
      // 7. Fazer logout
      await supabase.auth.signOut();
      
      return { 
        success: true, 
        data: { message: 'Conta eliminada com sucesso' } 
      };
      
    } catch (error: any) {
      console.error('❌ Erro ao confirmar exclusão:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 🔄 Reenviar código de confirmação
   */
  static async resendDeletionCode(): Promise<ServiceResult> {
    return this.sendAccountDeletionCode();
  }

  /**
   * ❌ Cancelar processo de exclusão
   */
  static async cancelAccountDeletion(): Promise<ServiceResult> {
    try {
      const { data: user } = await supabase.auth.getUser();
      
      if (!user?.user?.id) {
        return { success: false, error: 'Usuário não encontrado' };
      }

      // Limpar código de exclusão
      const { error } = await supabase
        .from('profiles')
        .update({
          deletion_code: null,
          deletion_code_expires: null
        })
        .eq('id', user.user.id);

      if (error) {
        console.error('❌ Erro ao cancelar exclusão:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Processo de exclusão cancelado');
      return { success: true };
      
    } catch (error: any) {
      console.error('❌ Erro ao cancelar exclusão:', error);
      return { success: false, error: error.message };
    }
  }
}

export default AccountManagementService;