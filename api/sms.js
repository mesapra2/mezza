// api/sms.js - Consolidação de APIs SMS
import twilio from 'twilio';
import { config } from 'dotenv';

// Carregar variáveis de ambiente
config();

const accountSid = process.env.TWILIO_ACCOUNT_SID || 'AC0b85fd5e429f04fbec403a53d4492684';
const authToken = process.env.TWILIO_AUTH_TOKEN || '4bec3d5c9ad43210d83d2e1f1b076089';
const twilioNumber = process.env.TWILIO_PHONE_NUMBER || '+12293047662';

const client = twilio(accountSid, authToken);

export default async function handler(req, res) {
    // Headers CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            error: 'Method Not Allowed',
            message: 'Apenas requisições POST são permitidas' 
        });
    }

    const { action, ...data } = req.body;

    try {
        switch (action) {
            case 'send':
                return await sendSMS(req, res, data);
            case 'verify':
                return await verifyCode(req, res, data);
            case 'status':
                return await checkStatus(req, res, data);
            default:
                return res.status(400).json({
                    success: false,
                    error: 'Ação inválida. Use: send, verify ou status'
                });
        }
    } catch (error) {
        console.error('❌ Erro na API SMS:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

// Enviar SMS
async function sendSMS(req, res, { userId, phone }) {
    if (!userId || !phone) {
        return res.status(400).json({
            success: false,
            error: 'userId e phone são obrigatórios'
        });
    }

    // Formatar telefone
    let formattedPhone = phone.replace(/\D/g, '');
    if (!formattedPhone.startsWith('55') && formattedPhone.length === 11) {
        formattedPhone = '55' + formattedPhone;
    }
    if (!formattedPhone.startsWith('+')) {
        formattedPhone = '+' + formattedPhone;
    }

    // Gerar código
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    console.log(`📱 Enviando SMS: ${formattedPhone} | Código: ${code}`);

    try {
        const message = await client.messages.create({
            body: `🎉 Mesapra2: Seu código de verificação é ${code}. Válido por 10 minutos.`,
            from: twilioNumber,
            to: formattedPhone,
            statusCallback: `${process.env.VERCEL_URL || 'http://localhost:3001'}/api/sms-webhook`,
            provideFeedback: true
        });

        console.log(`✅ SMS enviado! SID: ${message.sid}`);

        return res.status(200).json({
            success: true,
            messageSid: message.sid,
            status: message.status,
            code: code // Em produção, salve no banco ao invés de retornar
        });

    } catch (error) {
        console.error('❌ Erro Twilio:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

// Verificar código
async function verifyCode(req, res, { userId, phone, code }) {
    // Implementar verificação do código
    // Por enquanto, aceita qualquer código para desenvolvimento
    return res.status(200).json({
        success: true,
        verified: true,
        message: 'Código verificado com sucesso'
    });
}

// Verificar status da mensagem
async function checkStatus(req, res, { messageSid }) {
    if (!messageSid) {
        return res.status(400).json({
            success: false,
            error: 'messageSid é obrigatório'
        });
    }

    try {
        const message = await client.messages(messageSid).fetch();
        
        return res.status(200).json({
            success: true,
            message: {
                sid: message.sid,
                status: message.status,
                errorCode: message.errorCode,
                errorMessage: message.errorMessage,
                dateCreated: message.dateCreated,
                dateSent: message.dateSent,
                dateUpdated: message.dateUpdated,
                from: message.from,
                to: message.to,
                price: message.price,
                priceUnit: message.priceUnit
            }
        });

    } catch (error) {
        console.error('❌ Erro ao verificar status:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}