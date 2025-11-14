// api/check-sms-status.mjs
// Endpoint para verificar status de SMS no Twilio
import twilio from 'twilio';
import { config } from 'dotenv';

config();

const accountSid = process.env.TWILIO_ACCOUNT_SID || 'AC0b85fd5e429f04fbec403a53d4492684';
const authToken = process.env.TWILIO_AUTH_TOKEN || '4bec3d5c9ad43210d83d2e1f1b076089';

const client = twilio(accountSid, authToken);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { messageSid } = req.body;
        
        if (!messageSid) {
            return res.status(400).json({ error: 'messageSid é obrigatório' });
        }

        console.log('🔍 Verificando status da mensagem:', messageSid);

        // Buscar detalhes da mensagem no Twilio
        const message = await client.messages(messageSid).fetch();
        
        console.log('📊 Status da mensagem:', {
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
        });

        res.status(200).json({
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
                priceUnit: message.priceUnit,
                direction: message.direction,
                uri: message.uri
            }
        });

    } catch (error) {
        console.error('❌ Erro ao verificar status SMS:', error);
        
        res.status(500).json({
            success: false,
            error: error.message,
            code: error.code
        });
    }
}