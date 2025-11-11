/**
 * ========================================
 * SERVIÇO DE FLUXO PREMIUM
 * ========================================
 * 
 * Gerencia o fluxo completo de upgrade para Premium,
 * incluindo verificações necessárias antes do pagamento
 */

import { supabase } from '@/lib/supabaseClient';
import CertifiedUserService from '@/services/CertifiedUserService';

export interface PremiumFlowResult {
  success: boolean;
  action: 'proceed_payment' | 'require_verification' | 'require_login' | 'already_premium';
  message: string;
  redirectUrl?: string;
  verificationData?: {
    hasPhone: boolean;
    hasDocument: boolean;
    isVerified: boolean;
    missingSteps: string[];
  };
}

export interface UserVerificationStatus {
  isLoggedIn: boolean;
  hasProfile: boolean;
  hasPhone: boolean;
  phoneVerified: boolean;
  hasDocument: boolean;
  documentVerified: boolean;
  isPremium: boolean;
  isFullyVerified: boolean;
}

class PremiumFlowService {
  
  /**
   * ✅ VERIFICAR STATUS COMPLETO DO USUÁRIO
   */
  static async checkUserVerificationStatus(userId: string): Promise<UserVerificationStatus> {
    try {
      if (!userId) {
        return {
          isLoggedIn: false,
          hasProfile: false,
          hasPhone: false,
          phoneVerified: false,
          hasDocument: false,
          documentVerified: false,
          isPremium: false,
          isFullyVerified: false
        };
      }

      // Buscar dados do perfil
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Erro ao buscar perfil:', profileError);
        throw profileError;
      }

      // Verificar dados de verificação
      const { data: verification, error: verificationError } = await supabase
        .from('user_verifications')
        .select('*')
        .eq('user_id', userId)
        .single();

      // Se não encontrou verificação, não é erro
      const hasVerification = !verificationError && verification;

      const status: UserVerificationStatus = {
        isLoggedIn: true,
        hasProfile: !!profile,
        hasPhone: !!profile?.phone,
        phoneVerified: profile?.phone_verified === true,
        hasDocument: hasVerification && !!verification.document_url,
        documentVerified: hasVerification && verification.verification_status === 'approved',
        isPremium: profile?.is_premium === true,
        isFullyVerified: false
      };

      // Determinar se está totalmente verificado
      status.isFullyVerified = status.phoneVerified && status.documentVerified;

      return status;

    } catch (error) {
      console.error('Erro ao verificar status do usuário:', error);
      throw error;
    }
  }

  /**
   * ✅ INICIAR FLUXO PREMIUM
   * Verifica se o usuário pode prosseguir para pagamento ou precisa de verificações
   */
  static async initiatePremiumFlow(
    userId: string | null, 
    selectedPlan: string
  ): Promise<PremiumFlowResult> {
    try {
      // 1. Verificar se está logado
      if (!userId) {
        return {
          success: false,
          action: 'require_login',
          message: 'Você precisa fazer login para assinar o Premium.',
          redirectUrl: '/login'
        };
      }

      // 2. Verificar status completo do usuário
      const status = await this.checkUserVerificationStatus(userId);

      // 3. Se já é premium
      if (status.isPremium) {
        return {
          success: false,
          action: 'already_premium',
          message: 'Você já possui uma assinatura Premium ativa!'
        };
      }

      // 4. Verificar se precisa de verificações
      const missingSteps = this.getMissingVerificationSteps(status);
      
      if (missingSteps.length > 0) {
        return {
          success: false,
          action: 'require_verification',
          message: this.buildVerificationMessage(missingSteps),
          redirectUrl: this.getVerificationRedirectUrl(missingSteps[0]),
          verificationData: {
            hasPhone: status.hasPhone,
            hasDocument: status.hasDocument,
            isVerified: status.isFullyVerified,
            missingSteps
          }
        };
      }

      // 5. Se tudo está verificado, pode prosseguir para pagamento
      return {
        success: true,
        action: 'proceed_payment',
        message: 'Verificações completas! Prosseguindo para pagamento...'
      };

    } catch (error) {
      console.error('Erro no fluxo Premium:', error);
      return {
        success: false,
        action: 'require_verification',
        message: 'Erro ao verificar seu perfil. Tente novamente.'
      };
    }
  }

  /**
   * ✅ IDENTIFICAR ETAPAS DE VERIFICAÇÃO FALTANDO
   */
  private static getMissingVerificationSteps(status: UserVerificationStatus): string[] {
    const missing: string[] = [];

    if (!status.hasPhone) {
      missing.push('phone_number');
    } else if (!status.phoneVerified) {
      missing.push('phone_verification');
    }

    if (!status.hasDocument) {
      missing.push('document_upload');
    } else if (!status.documentVerified) {
      missing.push('document_verification');
    }

    return missing;
  }

  /**
   * ✅ CONSTRUIR MENSAGEM DE VERIFICAÇÃO
   */
  private static buildVerificationMessage(missingSteps: string[]): string {
    const stepMessages = {
      phone_number: 'adicionar seu número de telefone',
      phone_verification: 'verificar seu número de telefone',
      document_upload: 'enviar um documento de identidade',
      document_verification: 'aguardar a aprovação do seu documento'
    };

    if (missingSteps.length === 1) {
      const step = stepMessages[missingSteps[0] as keyof typeof stepMessages];
      return `Para assinar o Premium, você precisa ${step} primeiro.`;
    }

    const formattedSteps = missingSteps
      .map(step => stepMessages[step as keyof typeof stepMessages])
      .join(', ');

    return `Para assinar o Premium, você precisa: ${formattedSteps}.`;
  }

  /**
   * ✅ OBTER URL DE REDIRECIONAMENTO PARA VERIFICAÇÃO
   */
  private static getVerificationRedirectUrl(firstMissingStep: string): string {
    const redirectMap = {
      phone_number: '/verify-phone',
      phone_verification: '/verify-phone',
      document_upload: '/mobile-verification',
      document_verification: '/mobile-verification'
    };

    return redirectMap[firstMissingStep as keyof typeof redirectMap] || '/user/settings';
  }

  /**
   * ✅ PROCESSAR PAGAMENTO PREMIUM
   * Só chama se todas as verificações estiverem completas
   */
  static async processPremiumPayment(
    userId: string,
    userProfile: any,
    selectedPlan: string,
    planData: any
  ): Promise<{ success: boolean; charge?: any; error?: string }> {
    try {
      // Verificar novamente antes de processar
      const flowResult = await this.initiatePremiumFlow(userId, selectedPlan);
      
      if (flowResult.action !== 'proceed_payment') {
        return {
          success: false,
          error: flowResult.message
        };
      }

      // Criar cobrança no OpenPix
      const chargeData = {
        correlationID: `premium_${userId}_${Date.now()}`,
        value: planData.value,
        comment: `Assinatura ${planData.name} - Mesa Pra 2`,
        customer: {
          name: userProfile?.username || userProfile?.email?.split('@')[0],
          email: userProfile?.email,
          phone: userProfile?.phone
        },
        additionalInfo: [
          {
            key: "Plano",
            value: planData.name
          },
          {
            key: "Usuário",
            value: userId
          },
          {
            key: "Verificado",
            value: "true"
          }
        ]
      };

      const response = await fetch('/api/create-openpix-charge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chargeData)
      });

      const result = await response.json();

      if (result.success) {
        return {
          success: true,
          charge: result.charge
        };
      } else {
        return {
          success: false,
          error: result.error || 'Erro ao criar cobrança'
        };
      }

    } catch (error) {
      console.error('Erro ao processar pagamento Premium:', error);
      return {
        success: false,
        error: 'Erro interno ao processar pagamento'
      };
    }
  }

  /**
   * ✅ OBTER RESUMO DE VERIFICAÇÃO PARA UI
   */
  static async getVerificationSummary(userId: string) {
    try {
      const status = await this.checkUserVerificationStatus(userId);
      const missingSteps = this.getMissingVerificationSteps(status);

      return {
        isReady: status.isFullyVerified,
        isPremium: status.isPremium,
        progress: {
          phone: status.phoneVerified,
          document: status.documentVerified
        },
        nextStep: missingSteps[0] || null,
        nextStepUrl: missingSteps[0] ? this.getVerificationRedirectUrl(missingSteps[0]) : null,
        message: missingSteps.length > 0 
          ? this.buildVerificationMessage(missingSteps)
          : 'Todas as verificações estão completas!'
      };
    } catch (error) {
      console.error('Erro ao obter resumo de verificação:', error);
      return {
        isReady: false,
        isPremium: false,
        progress: { phone: false, document: false },
        nextStep: 'phone_number',
        nextStepUrl: '/verify-phone',
        message: 'Erro ao verificar status. Tente novamente.'
      };
    }
  }

  /**
   * ✅ VERIFICAR SE USUÁRIO PODE CRIAR EVENTOS PARTICULARES
   */
  static async canCreatePrivateEvents(userId: string): Promise<boolean> {
    try {
      const status = await this.checkUserVerificationStatus(userId);
      return status.isPremium && status.isFullyVerified;
    } catch (error) {
      console.error('Erro ao verificar permissões para eventos particulares:', error);
      return false;
    }
  }

  /**
   * ✅ SALVAR TENTATIVA DE UPGRADE PARA ANALYTICS
   */
  static async logPremiumAttempt(
    userId: string, 
    action: string, 
    result: string,
    additionalData?: any
  ) {
    try {
      await supabase
        .from('premium_flow_logs')
        .insert({
          user_id: userId,
          action, // 'initiated', 'verification_required', 'payment_started', etc.
          result, // 'success', 'failed', 'redirected'
          additional_data: additionalData,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      // Log silencioso - não deve afetar o fluxo principal
      console.warn('Erro ao salvar log de tentativa Premium:', error);
    }
  }
}

export default PremiumFlowService;