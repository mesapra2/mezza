// src/services/authService.test.ts

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import axios from 'axios';

// Mock do axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Importação direta sem usar type
let authService: any;

describe('AuthService', () => {
  const mockUserId = 'user-123';
  const mockPhone = '+5561999999999';
  const mockCode = '123456';
  const API_URL = 'http://localhost:4000';

  beforeEach(async () => {
    // Limpa todos os mocks antes de cada teste
    jest.clearAllMocks();
    
    // Reimporta o módulo para cada teste usando require
    jest.resetModules();
    authService = require('./authService').default;
  });

  describe('sendVerificationCode', () => {
    it('deve enviar código de verificação com sucesso', async () => {
      const mockResponse = {
        data: {
          success: true,
          message: 'Código enviado com sucesso'
        }
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await authService.sendVerificationCode({
        userId: mockUserId,
        phone: mockPhone
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        `${API_URL}/sms/send-code`,
        { userId: mockUserId, phone: mockPhone }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('deve lançar erro quando falhar ao enviar código', async () => {
      const mockError = {
        response: {
          data: {
            message: 'Número de telefone inválido'
          }
        }
      };

      mockedAxios.post.mockRejectedValueOnce(mockError);

      await expect(
        authService.sendVerificationCode({
          userId: mockUserId,
          phone: mockPhone
        })
      ).rejects.toThrow('Número de telefone inválido');
    });

    it('deve lançar erro genérico quando não houver mensagem específica', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        authService.sendVerificationCode({
          userId: mockUserId,
          phone: mockPhone
        })
      ).rejects.toThrow('Erro ao enviar código');
    });
  });

  describe('verifyPhone', () => {
    it('deve verificar código com sucesso', async () => {
      const mockResponse = {
        data: {
          success: true,
          message: 'Telefone verificado com sucesso'
        }
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await authService.verifyPhone({
        userId: mockUserId,
        code: mockCode
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        `${API_URL}/sms/verify-code`,
        { userId: mockUserId, code: mockCode }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('deve lançar erro quando código for inválido', async () => {
      const mockError = {
        response: {
          data: {
            message: 'Código expirado'
          }
        }
      };

      mockedAxios.post.mockRejectedValueOnce(mockError);

      await expect(
        authService.verifyPhone({
          userId: mockUserId,
          code: mockCode
        })
      ).rejects.toThrow('Código expirado');
    });

    it('deve lançar erro genérico quando não houver mensagem específica', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        authService.verifyPhone({
          userId: mockUserId,
          code: mockCode
        })
      ).rejects.toThrow('Código inválido');
    });
  });

  describe('resendVerificationCode', () => {
    it('deve reenviar código com sucesso', async () => {
      const mockResponse = {
        data: {
          success: true,
          message: 'Código reenviado com sucesso'
        }
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await authService.resendVerificationCode({
        userId: mockUserId,
        phone: mockPhone
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        `${API_URL}/sms/resend-code`,
        { userId: mockUserId, phone: mockPhone }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('deve lançar erro quando falhar ao reenviar código', async () => {
      const mockError = {
        response: {
          data: {
            message: 'Limite de tentativas excedido'
          }
        }
      };

      mockedAxios.post.mockRejectedValueOnce(mockError);

      await expect(
        authService.resendVerificationCode({
          userId: mockUserId,
          phone: mockPhone
        })
      ).rejects.toThrow('Limite de tentativas excedido');
    });
  });

  describe('Métodos de compatibilidade', () => {
    it('verifyCode deve chamar verifyPhone', async () => {
      const mockResponse = {
        data: {
          success: true
        }
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await authService.verifyCode({
        userId: mockUserId,
        code: mockCode
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        `${API_URL}/sms/verify-code`,
        { userId: mockUserId, code: mockCode }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('resendCode deve chamar resendVerificationCode', async () => {
      const mockResponse = {
        data: {
          success: true
        }
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await authService.resendCode({
        userId: mockUserId,
        phone: mockPhone
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        `${API_URL}/sms/resend-code`,
        { userId: mockUserId, phone: mockPhone }
      );
      expect(result).toEqual(mockResponse.data);
    });
  });
});