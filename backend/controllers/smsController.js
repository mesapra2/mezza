// backend/controllers/smsController.js
const { createClient } = require('@supabase/supabase-js');
const twilioService = require('../services/twilioService');
const { generateVerificationCode } = require('../utils/codeGenerator');

// Cliente Supabase com Service Role Key (acesso admin)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Armazena códigos temporariamente (em produção use Redis)
const verificationCodes = new Map();

// Envia código de verificação
exports.sendVerificationCode = async (req, res) => {
  try {
    const { userId, phone } = req.body;

    if (!userId || !phone) {
      return res.status(400).json({ 
        message: 'userId e phone são obrigatórios' 
      });
    }

    // Valida formato do telefone
    if (!phone.startsWith('+55') || phone.replace(/\D/g, '').length !== 13) {
      return res.status(400).json({ 
        message: 'Telefone brasileiro inválido' 
      });
    }

    // Verifica se o usuário existe no Supabase
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, phone, phone_verified')
      .eq('id', userId)
      .single();

    if (profileError) {
      return res.status(404).json({ 
        message: 'Usuário não encontrado' 
      });
    }

    // Se já verificou, não precisa reenviar
    if (profile.phone_verified) {
      return res.status(400).json({ 
        message: 'Telefone já verificado' 
      });
    }

    // Gera código de 6 dígitos
    const code = generateVerificationCode();
    const expires = Date.now() + 10 * 60 * 1000; // 10 minutos

    // Armazena o código (em produção use Redis ou banco)
    verificationCodes.set(userId, { code, phone, expires });

    // Envia SMS via Twilio
    try {
      await twilioService.sendVerificationSMS(phone, code);
      console.log(`✅ SMS enviado para ${phone} (user: ${userId})`);
    } catch (smsError) {
      console.error('Erro ao enviar SMS:', smsError);
      return res.status(500).json({ 
        message: 'Erro ao enviar SMS',
        error: smsError.message 
      });
    }

    res.json({
      message: 'Código enviado com sucesso',
      expiresIn: 600 // 10 minutos em segundos
    });
  } catch (error) {
    console.error('Erro em sendVerificationCode:', error);
    res.status(500).json({ 
      message: 'Erro ao enviar código',
      error: error.message 
    });
  }
};

// Verifica código
exports.verifyCode = async (req, res) => {
  try {
    const { userId, code } = req.body;

    if (!userId || !code) {
      return res.status(400).json({ 
        message: 'userId e code são obrigatórios' 
      });
    }

    // Busca o código armazenado
    const stored = verificationCodes.get(userId);

    if (!stored) {
      return res.status(400).json({ 
        message: 'Código não encontrado. Solicite um novo código.' 
      });
    }

    // Verifica se expirou
    if (Date.now() > stored.expires) {
      verificationCodes.delete(userId);
      return res.status(400).json({ 
        message: 'Código expirado. Solicite um novo código.' 
      });
    }

    // Verifica se o código está correto
    if (stored.code !== code) {
      return res.status(400).json({ 
        message: 'Código inválido' 
      });
    }

    // Atualiza o perfil no Supabase
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        phone: stored.phone,
        phone_verified: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Erro ao atualizar perfil:', updateError);
      return res.status(500).json({ 
        message: 'Erro ao verificar telefone' 
      });
    }

    // Remove o código usado
    verificationCodes.delete(userId);

    console.log(`✅ Telefone verificado para user: ${userId}`);

    res.json({
      message: 'Telefone verificado com sucesso',
      phoneVerified: true
    });
  } catch (error) {
    console.error('Erro em verifyCode:', error);
    res.status(500).json({ 
      message: 'Erro ao verificar código',
      error: error.message 
    });
  }
};

// Reenvia código
exports.resendCode = async (req, res) => {
  try {
    const { userId, phone } = req.body;

    if (!userId || !phone) {
      return res.status(400).json({ 
        message: 'userId e phone são obrigatórios' 
      });
    }

    // Verifica se já tem um código ativo
    const existing = verificationCodes.get(userId);
    
    // Se tem código válido há menos de 30 segundos, não reenvia
    if (existing && (existing.expires - Date.now()) > 9.5 * 60 * 1000) {
      return res.status(429).json({ 
        message: 'Aguarde 30 segundos antes de solicitar novo código',
        retryAfter: 30
      });
    }

    // Gera novo código
    const code = generateVerificationCode();
    const expires = Date.now() + 10 * 60 * 1000;

    // Atualiza o código
    verificationCodes.set(userId, { code, phone, expires });

    // Envia SMS
    try {
      await twilioService.sendVerificationSMS(phone, code, true);
      console.log(`🔄 SMS reenviado para ${phone} (user: ${userId})`);
    } catch (smsError) {
      console.error('Erro ao reenviar SMS:', smsError);
      return res.status(500).json({ 
        message: 'Erro ao reenviar SMS',
        error: smsError.message 
      });
    }

    res.json({
      message: 'Código reenviado com sucesso',
      expiresIn: 600
    });
  } catch (error) {
    console.error('Erro em resendCode:', error);
    res.status(500).json({ 
      message: 'Erro ao reenviar código',
      error: error.message 
    });
  }
};