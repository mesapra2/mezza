// api/send-verification-sms.js
const twilio = require('twilio');

// Configurações do Twilio
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

// Função para enviar SMS
async function sendVerificationSMS(phone, code, isResend = false) {
  const message = isResend 
    ? `🔄 Mesapra2 - Novo código\n\nSeu novo código de verificação é: ${code}\n\nEste código expira em 10 minutos.\n\nMesapra2`
    : `🎉 Bem-vindo ao Mesapra2!\n\nSeu código de verificação é: ${code}\n\nEste código expira em 10 minutos.\n\nSe você não solicitou este código, ignore esta mensagem.\n\nMesapra2 - Eventos sociais em restaurantes`;

  try {
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

// Armazenamento temporário de códigos (em produção, usar Redis ou banco)
const verificationCodes = new Map();

// Gerar código de 6 dígitos
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default async function handler(req, res) {
  // Apenas POST é permitido
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { phone, userId } = req.body;

    // Validar dados de entrada
    if (!phone || !userId) {
      return res.status(400).json({ error: 'Telefone e userId são obrigatórios' });
    }

    // Validar formato do telefone brasileiro
    const phoneRegex = /^\+55\d{11}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ error: 'Formato de telefone inválido' });
    }

    // Verificar rate limiting (máximo 3 tentativas por hora)
    const rateLimitKey = `sms_${userId}_${phone}`;
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    // Limpar códigos expirados
    for (const [key, data] of verificationCodes.entries()) {
      if (now - data.timestamp > oneHour) {
        verificationCodes.delete(key);
      }
    }

    // Contar tentativas da última hora
    const recentAttempts = Array.from(verificationCodes.values())
      .filter(data => 
        data.userId === userId && 
        data.phone === phone && 
        now - data.timestamp < oneHour
      ).length;

    if (recentAttempts >= 3) {
      return res.status(429).json({ 
        error: 'Muitas tentativas. Tente novamente em 1 hora.' 
      });
    }

    // Gerar código de verificação
    const code = generateCode();
    const codeKey = `${userId}_${phone}`;
    
    // Armazenar código temporariamente (10 minutos)
    verificationCodes.set(codeKey, {
      code,
      userId,
      phone,
      timestamp: now,
      attempts: 0
    });

    // Enviar SMS usando Twilio
    const result = await sendVerificationSMS(phone, code);

    console.log(`✅ SMS enviado para ${phone}. Código: ${code} (SID: ${result.messageSid})`);

    res.status(200).json({
      success: true,
      message: 'Código enviado com sucesso',
      messageSid: result.messageSid
    });

  } catch (error) {
    console.error('❌ Erro ao enviar SMS:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
}

// Função utilitária para limpar códigos expirados (pode ser chamada periodicamente)
export function cleanupExpiredCodes() {
  const now = Date.now();
  const tenMinutes = 10 * 60 * 1000;
  
  for (const [key, data] of verificationCodes.entries()) {
    if (now - data.timestamp > tenMinutes) {
      verificationCodes.delete(key);
    }
  }
}

// Exportar para testes
export { verificationCodes };