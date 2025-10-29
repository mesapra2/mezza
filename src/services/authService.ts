// src/services/authService.ts
import axios from 'axios';

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:4000';

interface SendCodeData {
  userId: string;
  phone: string;
}

interface VerifyCodeData {
  userId: string;
  code: string;
}

class AuthService {
  // Envia código de verificação via SMS
  async sendVerificationCode(data: SendCodeData) {
    try {
      const response = await axios.post(`${API_URL}/sms/send-code`, data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erro ao enviar código');
    }
  }

  // Verifica o código SMS e atualiza o perfil
  async verifyPhone(data: VerifyCodeData) {
    try {
      const response = await axios.post(`${API_URL}/sms/verify-code`, data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Código inválido');
    }
  }

  // Reenvia o código SMS
  async resendVerificationCode(data: SendCodeData) {
    try {
      const response = await axios.post(`${API_URL}/sms/resend-code`, data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erro ao reenviar código');
    }
  }

  // Métodos antigos (mantidos para compatibilidade)
  async verifyCode(data: VerifyCodeData) {
    return this.verifyPhone(data);
  }

  async resendCode(data: SendCodeData) {
    return this.resendVerificationCode(data);
  }
}

export default new AuthService();