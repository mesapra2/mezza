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
    accountSid: accountSid ? '✅ OK' : '❌ Missing',
    authToken: authToken ? '✅ OK' : '❌ Missing',
    twilioNumber: twilioNumber ? '✅ OK' : '❌ Missing'
});

// Validar credenciais
if (!accountSid || !authToken || !twilioNumber) {
    console.error('❌ Credenciais da Twilio não configuradas');
    throw new Error('❌ Credenciais da Twilio não configuradas no .env');
}

const client = twilio(accountSid, authToken);

// Armazenar códigos de verificação temporariamente (em produção, use Redis ou banco)
export const verificationCodes = new Map();

// Função para gerar código de 6 dígitos
function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

export default async function handler(req, res) {
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
        
        const message = await client.messages.create({
            body: `Seu código para Mesapra2 é: ${code}`,
            from: twilioNumber,
            to: phone
        });

        console.log(`✅ SMS enviado! SID: ${message.sid}`);

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
}