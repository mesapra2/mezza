// backend/services/twilioService.js
const twilio = require('twilio');

// Configuração do Twilio
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

class TwilioService {
  /**
   * Template da mensagem de verificação
   */
  getVerificationMessageTemplate(code) {
    return `🎉 Bem-vindo ao Mesapra2!

Seu código de verificação é: ${code}

Este código expira em 10 minutos.

Se você não solicitou este código, ignore esta mensagem.

Mesapra2 - Eventos sociais em restaurantes`;
  }

  /**
   * Template da mensagem de código reenviado
   */
  getResendMessageTemplate(code) {
    return `🔄 Mesapra2 - Novo código

Seu novo código de verificação é: ${code}

Este código expira em 10 minutos.

Mesapra2`;
  }

  /**
   * Envia SMS de verificação
   */
  async sendVerificationSMS(phone, code, isResend = false) {
    try {
      // Valida o telefone
      if (!phone || !phone.startsWith('+')) {
        throw new Error('Número de telefone inválido');
      }

      // Seleciona o template correto
      const message = isResend 
        ? this.getResendMessageTemplate(code)
        : this.getVerificationMessageTemplate(code);

      // Envia a mensagem
      const result = await client.messages.create({
        body: message,
        from: twilioPhoneNumber,
        to: phone,
      });

      console.log(`✅ SMS enviado para ${phone}. SID: ${result.sid}`);
      
      return {
        success: true,
        messageSid: result.sid,
        status: result.status,
      };
    } catch (error) {
      console.error('❌ Erro ao enviar SMS:', error);
      throw new Error(`Falha ao enviar SMS: ${error.message}`);
    }
  }

  /**
   * Envia SMS de boas-vindas após verificação
   */
  async sendWelcomeSMS(phone, name) {
    try {
      const message = `✨ Olá ${name}!

Seu cadastro foi concluído com sucesso!

Explore eventos incríveis em restaurantes da sua região e conecte-se com novas pessoas.

Aproveite o Mesapra2! 🍽️🎉`;

      const result = await client.messages.create({
        body: message,
        from: twilioPhoneNumber,
        to: phone,
      });

      console.log(`✅ SMS de boas-vindas enviado para ${phone}`);
      
      return {
        success: true,
        messageSid: result.sid,
      };
    } catch (error) {
      console.error('⚠️ Erro ao enviar SMS de boas-vindas:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Verifica o status de uma mensagem
   */
  async checkMessageStatus(messageSid) {
    try {
      const message = await client.messages(messageSid).fetch();
      
      return {
        status: message.status,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
        dateCreated: message.dateCreated,
        dateSent: message.dateSent,
      };
    } catch (error) {
      console.error('❌ Erro ao verificar status da mensagem:', error);
      throw new Error(`Falha ao verificar status: ${error.message}`);
    }
  }
}

module.exports = new TwilioService();