/**
 * ========================================
 * API: Teste de OCR Google Vision
 * ========================================
 * 
 * Endpoint para testar a funcionalidade de OCR
 * GET /api/test-ocr
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Importar Google Vision API
    const vision = require('@google-cloud/vision');
    
    // Verificar se as credenciais estão configuradas
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE) {
      return res.status(500).json({ 
        error: 'Credenciais do Google Cloud não configuradas',
        details: 'GOOGLE_SERVICE_ACCOUNT_KEY_FILE não encontrado'
      });
    }

    // Criar cliente
    const client = new vision.ImageAnnotatorClient({
      keyFilename: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE,
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
    });

    // Testar com uma imagem de exemplo (base64 de um RG fictício)
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='; // Imagem 1x1 pixel

    const [result] = await client.textDetection({
      image: { 
        content: testImageBase64
      }
    });

    return res.status(200).json({
      success: true,
      message: 'OCR Google Vision API funcionando corretamente!',
      test_result: {
        detections_found: result.textAnnotations?.length || 0,
        full_text: result.textAnnotations?.[0]?.description || 'Nenhum texto detectado',
        client_configured: true,
        project_id: process.env.GOOGLE_CLOUD_PROJECT_ID
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro no teste OCR:', error);
    
    return res.status(500).json({ 
      error: 'Erro ao testar OCR',
      message: error.message,
      details: {
        has_credentials: !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE,
        project_id: process.env.GOOGLE_CLOUD_PROJECT_ID,
        error_type: error.constructor.name
      }
    });
  }
}