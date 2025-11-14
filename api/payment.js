// api/payment.js - Consolidação de APIs de pagamento
export default async function handler(req, res) {
    // Headers CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { action, ...data } = req.body;

    try {
        switch (action) {
            case 'create-charge':
                return await createCharge(req, res, data);
            case 'webhook':
                return await handleWebhook(req, res, data);
            default:
                return res.status(400).json({
                    success: false,
                    error: 'Ação inválida. Use: create-charge ou webhook'
                });
        }
    } catch (error) {
        console.error('❌ Erro na API de pagamento:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

// Criar cobrança OpenPix
async function createCharge(req, res, data) {
    // Implementar lógica do create-openpix-charge.js
    return res.status(200).json({
        success: true,
        message: 'Cobrança criada',
        charge: {
            id: 'charge_' + Date.now(),
            status: 'pending'
        }
    });
}

// Webhook OpenPix
async function handleWebhook(req, res, data) {
    // Implementar lógica do openpix-webhook.js
    return res.status(200).json({
        success: true,
        message: 'Webhook processado'
    });
}