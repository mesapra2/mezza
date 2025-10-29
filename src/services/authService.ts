// src/services/authService.ts
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone: string;
}

interface VerifyPhoneData {
  userId: string;
  code: string;
}

interface ResendCodeData {
  userId: string;
  phone: string;
}

class AuthService {
  // Registra o usuário e envia SMS de verificação
  async register(data: RegisterData) {
    try {
      const response = await axios.post(`${API_URL}/auth/register`, data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erro ao registrar usuário');
    }
  }

  // Verifica o código SMS
  async verifyPhone(data: VerifyPhoneData) {
    try {
      const response = await axios.post(`${API_URL}/auth/verify-phone`, data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Código inválido');
    }
  }

  // Reenvia o código SMS
  async resendVerificationCode(data: ResendCodeData) {
    try {
      const response = await axios.post(`${API_URL}/auth/resend-code`, data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erro ao reenviar código');
    }
  }

  // Verifica se o usuário já confirmou o telefone
  async checkPhoneVerification(userId: string) {
    try {
      const response = await axios.get(`${API_URL}/auth/check-verification/${userId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erro ao verificar status');
    }
  }
}

export default new AuthService();