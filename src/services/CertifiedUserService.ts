/**
 * ========================================
 * SERVIÇO DE USUÁRIOS CERTIFICADOS
 * ========================================
 * 
 * Gerencia usuários verificados e suas funcionalidades especiais
 */

import { supabase } from '@/lib/supabaseClient';

export interface CertifiedUser {
  id: string;
  user_id: string;
  cpf: string;
  verification_date: string;
  certificate_type: 'document' | 'biometric' | 'full';
  trust_score: number;
  verification_metadata: {
    method: string;
    ocr_confidence?: number;
    facial_match?: number;
    document_quality?: number;
  };
}

export class CertifiedUserService {
  
  /**
   * Verificar se um usuário é certificado
   */
  static async isCertified(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('user_verifications')
        .select('status')
        .eq('user_id', userId)
        .eq('status', 'approved')
        .single();

      if (error) {
        console.log('Usuário não certificado:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Erro ao verificar certificação:', error);
      return false;
    }
  }

  /**
   * Obter dados de certificação do usuário
   */
  static async getCertificationData(userId: string): Promise<CertifiedUser | null> {
    try {
      const { data, error } = await supabase
        .from('user_verifications')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'approved')
        .single();

      if (error || !data) {
        return null;
      }

      return {
        id: data.id,
        user_id: data.user_id,
        cpf: data.cpf,
        verification_date: data.reviewed_at,
        certificate_type: 'document', // Por enquanto apenas documento
        trust_score: this.calculateTrustScore(data),
        verification_metadata: data.metadata || {}
      };
    } catch (error) {
      console.error('Erro ao obter dados de certificação:', error);
      return null;
    }
  }

  /**
   * Calcular score de confiança baseado nos dados de verificação
   */
  private static calculateTrustScore(verificationData: any): number {
    let score = 60; // Base score para documentos verificados

    // Bonus por verificação automática bem-sucedida
    if (verificationData.metadata?.verificacao_automatica) {
      score += 20;
    }

    // Bonus por qualidade dos dados
    if (verificationData.metadata?.ocr_confidence > 0.8) {
      score += 10;
    }

    // Bonus por ter selfie
    if (verificationData.selfie_url) {
      score += 10;
    }

    return Math.min(score, 100);
  }

  /**
   * Listar usuários certificados (admin apenas)
   */
  static async listCertifiedUsers(limit = 50): Promise<CertifiedUser[]> {
    try {
      const { data, error } = await supabase
        .from('user_verifications')
        .select(`
          *,
          profiles!inner(
            full_name,
            username,
            avatar_url
          )
        `)
        .eq('status', 'approved')
        .order('reviewed_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return data.map(item => ({
        id: item.id,
        user_id: item.user_id,
        cpf: item.cpf,
        verification_date: item.reviewed_at,
        certificate_type: 'document',
        trust_score: this.calculateTrustScore(item),
        verification_metadata: item.metadata || {}
      }));
    } catch (error) {
      console.error('Erro ao listar usuários certificados:', error);
      return [];
    }
  }

  /**
   * Verificar se CPF já foi usado em outra conta
   */
  static async checkCPFDuplicate(cpf: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('user_verifications')
        .select('user_id')
        .eq('cpf', cpf)
        .eq('status', 'approved');

      if (error) {
        return false;
      }

      return (data?.length || 0) > 0;
    } catch (error) {
      console.error('Erro ao verificar CPF duplicado:', error);
      return false;
    }
  }

  /**
   * Revogar certificação de usuário
   */
  static async revokeCertification(userId: string, reason: string): Promise<boolean> {
    try {
      const { error: updateError } = await supabase
        .from('user_verifications')
        .update({
          status: 'revoked',
          rejection_reason: reason,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (updateError) {
        throw updateError;
      }

      // Atualizar profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ is_verified: false })
        .eq('id', userId);

      if (profileError) {
        console.error('Erro ao atualizar profile:', profileError);
      }

      return true;
    } catch (error) {
      console.error('Erro ao revogar certificação:', error);
      return false;
    }
  }
}

export default CertifiedUserService;