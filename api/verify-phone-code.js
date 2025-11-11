// api/verify-phone-code.js
import { verificationCodes } from './send-verification-sms.js';

export default async function handler(req, res) {
  // Apenas POST é permitido
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { code, userId } = req.body;

    // Validar dados de entrada
    if (!code || !userId) {
      return res.status(400).json({ error: 'Código e userId são obrigatórios' });
    }

    // Validar formato do código (6 dígitos)
    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: 'Código deve ter 6 dígitos' });
    }

    // Buscar código de verificação
    let foundKey = null;
    let foundData = null;

    for (const [key, data] of verificationCodes.entries()) {
      if (data.userId === userId) {
        foundKey = key;
        foundData = data;
        break;
      }
    }

    // Verificar se existe código para este usuário
    if (!foundData) {
      return res.status(404).json({ 
        error: 'Nenhum código de verificação encontrado. Solicite um novo código.' 
      });
    }

    // Verificar se o código expirou (10 minutos)
    const now = Date.now();
    const tenMinutes = 10 * 60 * 1000;
    
    if (now - foundData.timestamp > tenMinutes) {
      verificationCodes.delete(foundKey);
      return res.status(410).json({ 
        error: 'Código expirado. Solicite um novo código.' 
      });
    }

    // Verificar número de tentativas (máximo 3)
    if (foundData.attempts >= 3) {
      verificationCodes.delete(foundKey);
      return res.status(429).json({ 
        error: 'Muitas tentativas incorretas. Solicite um novo código.' 
      });
    }

    // Verificar se o código está correto
    if (foundData.code !== code) {
      // Incrementar tentativas
      foundData.attempts += 1;
      verificationCodes.set(foundKey, foundData);
      
      const remainingAttempts = 3 - foundData.attempts;
      return res.status(400).json({ 
        error: `Código incorreto. ${remainingAttempts} tentativa(s) restante(s).`,
        remainingAttempts
      });
    }

    // Código correto! Remover da memória
    const phone = foundData.phone;
    verificationCodes.delete(foundKey);

    console.log(`✅ Código verificado com sucesso para usuário ${userId}, telefone ${phone}`);

    res.status(200).json({
      success: true,
      message: 'Código verificado com sucesso',
      phone: phone
    });

  } catch (error) {
    console.error('❌ Erro ao verificar código:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
}

// Função utilitária para estatísticas (opcional)
export function getVerificationStats() {
  const stats = {
    activeCodes: verificationCodes.size,
    codesByUser: {}
  };
  
  for (const [key, data] of verificationCodes.entries()) {
    if (!stats.codesByUser[data.userId]) {
      stats.codesByUser[data.userId] = 0;
    }
    stats.codesByUser[data.userId]++;
  }
  
  return stats;
}