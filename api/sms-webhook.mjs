// api/sms-webhook.mjs
// Webhook para receber atualizações de status do Twilio
export default async function handler(req, res) {
    console.log('📨 SMS Webhook recebido:', req.body);
    
    const {
        MessageSid,
        MessageStatus,
        To,
        From,
        ErrorCode,
        ErrorMessage
    } = req.body;

    console.log(`📱 SMS Status Update:`, {
        sid: MessageSid,
        status: MessageStatus,
        to: To,
        from: From,
        errorCode: ErrorCode,
        errorMessage: ErrorMessage,
        timestamp: new Date().toISOString()
    });

    // Log específico para problemas
    if (MessageStatus === 'failed' || MessageStatus === 'undelivered') {
        console.error(`❌ SMS FALHOU:`, {
            sid: MessageSid,
            to: To,
            status: MessageStatus,
            error: ErrorCode,
            message: ErrorMessage
        });
    } else if (MessageStatus === 'delivered') {
        console.log(`✅ SMS ENTREGUE:`, {
            sid: MessageSid,
            to: To
        });
    }

    res.status(200).send('OK');
}