// api/send-verification-sms.mjs
// Função serverless para envio de SMS via Twilio
import twilio from 'twilio';

// Pegar credenciais das variáveis de ambiente
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioNumber = process.env.TWILIO_PHONE_NUMBER;

// Validar credenciais
if (!accountSid || !authToken || !twilioNumber) {
    throw new Error('❌ Credenciais da Twilio não configuradas no .env');
}

const client = twilio(accountSid, authToken);

export default async function handler(req, res) {
    // Permitir apenas POST
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            error: 'Method Not Allowed',
            message: 'Apenas requisições POST são permitidas' 
        });
    }

    const { phoneNumber, code } = req.body;

    // Validar dados
    if (!phoneNumber || !code) {
        return res.status(400).json({ 
            error: 'Bad Request',
            message: 'phoneNumber e code são obrigatórios' 
        });
    }

    try {
        console.log(`📱 Enviando SMS para: ${phoneNumber}`);
        
        const message = await client.messages.create({
            body: `MesaPra2: Seu código de verificação é ${code}`,
            from: twilioNumber,
            to: phoneNumber
        });

        console.log(`✅ SMS enviado! SID: ${message.sid}`);

        res.status(200).json({
            success: true,
            messageSid: message.sid,
            status: message.status
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