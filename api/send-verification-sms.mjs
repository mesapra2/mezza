// api/send-verification-sms.mjs
// Função serverless para envio de SMS via Twilio
import twilio from 'twilio';
import { config } from 'dotenv';

// Carregar variáveis de ambiente
config();

// Pegar credenciais das variáveis de ambiente (com fallback para valores diretos em dev)
const accountSid = process.env.TWILIO_ACCOUNT_SID || 'AC0b85fd5e429f04fbec403a53d4492684';
const authToken = process.env.TWILIO_AUTH_TOKEN || '4bec3d5c9ad43210d83d2e1f1b076089';
const twilioNumber = process.env.TWILIO_PHONE_NUMBER || '+12293047662';

console.log('🔧 Credenciais carregadas:', {
    accountSid: accountSid ? `✅ ${accountSid.substring(0, 8)}...` : '❌ Missing',
    authToken: authToken ? `✅ ${authToken.substring(0, 8)}...` : '❌ Missing',
    twilioNumber: twilioNumber ? `✅ ${twilioNumber}` : '❌ Missing',
    nodeEnv: process.env.NODE_ENV || 'development'
});

// Validar credenciais básicas
if (!accountSid || !authToken || !twilioNumber) {
    const errorMsg = '❌ Credenciais da Twilio não configuradas completamente';
    console.error(errorMsg, {
        hasAccountSid: !!accountSid,
        hasAuthToken: !!authToken,
        hasTwilioNumber: !!twilioNumber
    });
    // Don't throw in development, just log the error
    if (process.env.NODE_ENV === 'production') {
        throw new Error(errorMsg);
    }
}

const client = twilio(accountSid, authToken);

// Armazenar códigos de verificação temporariamente (em produção, use Redis ou banco)
export const verificationCodes = new Map();

// Função para gerar código de 6 dígitos
function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

export default async function handler(req, res) {
    // Adicionar headers CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Permitir apenas POST
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            error: 'Method Not Allowed',
            message: 'Apenas requisições POST são permitidas' 
        });
    }

    try {
        const { phone, userId } = req.body;
        
        console.log('📞 Nova requisição SMS:', { phone, userId });

        // Validar dados
        if (!phone || !userId) {
            return res.status(400).json({ 
                error: 'Bad Request',
                message: 'phone e userId são obrigatórios' 
            });
        }

        // Gerar código de verificação aleatório
        const code = generateVerificationCode();
        
        // Log para debug - verificar se o código é realmente aleatório
        console.log(`🔢 Código gerado: ${code} para usuário ${userId}`);
        console.log(`📱 Telefone formatado: ${phone}`);
        
        // Armazenar código temporariamente (expira em 10 minutos)
        const timestamp = Date.now();
        verificationCodes.set(phone, { 
            code, 
            userId, 
            phone,
            timestamp,
            attempts: 0
        });
        
        console.log(`📱 Enviando SMS para: ${phone} com código: ${code}`);
        
        // Validar e formatar número brasileiro
        let formattedPhone = phone.replace(/\D/g, '');
        
        // Se não tem código do país, adiciona 55
        if (!formattedPhone.startsWith('55') && formattedPhone.length === 11) {
            formattedPhone = '55' + formattedPhone;
        }
        
        // Adiciona + se não tiver
        if (!formattedPhone.startsWith('+')) {
            formattedPhone = '+' + formattedPhone;
        }
        
        // Validar formato final
        const phoneRegex = /^\+55\d{11}$/;
        if (!phoneRegex.test(formattedPhone)) {
            console.log(`❌ Formato de telefone inválido: ${phone} → ${formattedPhone}`);
            return res.status(400).json({
                success: false,
                error: 'Formato de telefone inválido. Use 61984656910 ou +5561984656910'
            });
        }
        
        phone = formattedPhone; // Usa o número formatado
        console.log(`📱 Número formatado: ${phone}`);

        console.log(`📤 Enviando de: ${twilioNumber} para: ${phone}`);
        console.log(`📝 Mensagem: Seu código para Mesapra2 é: ${code}`);

        const message = await client.messages.create({
            body: `🎉 Mesapra2: Seu código de verificação é ${code}. Válido por 10 minutos.`,
            from: twilioNumber,
            to: phone,
            // Adicionar configurações extras para produção
            statusCallback: `${process.env.VERCEL_URL || 'http://localhost:3001'}/api/sms-webhook`,
            provideFeedback: true
        });

        console.log(`✅ SMS enviado! SID: ${message.sid}`);
        console.log(`📊 Status inicial: ${message.status}`);
        console.log(`💰 Preço: ${message.price} ${message.priceUnit}`);

        res.status(200).json({
            success: true,
            messageSid: message.sid,
            status: message.status,
            message: 'Código de verificação enviado com sucesso'
        });

    } catch (error) {
        console.error('❌ Erro ao enviar SMS:', error);
        
        res.status(500).json({
            success: false,
            error: error.message,
            code: error.code
        });
    }
}