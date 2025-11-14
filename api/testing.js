// api/testing.js - Consolidação de APIs de teste
export default async function handler(req, res) {
    // Headers CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { action, ...data } = req.body;

    try {
        switch (action) {
            case 'ocr':
                return await testOCR(req, res, data);
            case 'vision':
                return await testVision(req, res, data);
            case 'og':
                return await testOG(req, res, data);
            default:
                return res.status(400).json({
                    success: false,
                    error: 'Ação inválida. Use: ocr, vision ou og'
                });
        }
    } catch (error) {
        console.error('❌ Erro na API de teste:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

// Teste OCR
async function testOCR(req, res, data) {
    return res.status(200).json({
        success: true,
        message: 'OCR testado',
        result: 'Texto extraído do documento'
    });
}

// Teste Vision
async function testVision(req, res, data) {
    return res.status(200).json({
        success: true,
        message: 'Vision API testada',
        result: 'Imagem processada'
    });
}

// Teste OG
async function testOG(req, res, data) {
    return res.status(200).json({
        success: true,
        message: 'Open Graph testado',
        result: 'Meta tags geradas'
    });
}