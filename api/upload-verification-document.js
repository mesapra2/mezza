/**
 * ========================================
 * API: Upload de Documentos de Verificação
 * ========================================
 * 
 * API para upload de documentos de verificação para o Supabase Storage
 */

import { createClient } from '@supabase/supabase-js';
import formidable from 'formidable';
import fs from 'fs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const config = {
  api: {
    bodyParser: false, // Desabilitar o bodyParser padrão para usar formidable
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const form = formidable({
    maxFileSize: 5 * 1024 * 1024, // 5MB
    keepExtensions: true,
  });

  try {
    const [fields, files] = await form.parse(req);
    
    const file = files.file?.[0];
    const fileName = fields.fileName?.[0];
    const userId = fields.userId?.[0];

    if (!file || !fileName || !userId) {
      return res.status(400).json({ 
        error: 'Arquivo, nome do arquivo e userId são obrigatórios' 
      });
    }

    // Verificar tipo de arquivo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({ 
        error: 'Tipo de arquivo não permitido. Use JPEG, PNG ou WebP.' 
      });
    }

    // Ler o arquivo
    const fileBuffer = fs.readFileSync(file.filepath);

    // Upload para Supabase Storage
    const { data, error } = await supabase.storage
      .from('verification-documents')
      .upload(fileName, fileBuffer, {
        contentType: file.mimetype,
        upsert: true
      });

    if (error) {
      console.error('Erro no upload:', error);
      return res.status(500).json({ 
        error: 'Erro ao fazer upload do arquivo',
        details: error.message
      });
    }

    // Gerar URL pública do arquivo
    const { data: urlData } = supabase.storage
      .from('verification-documents')
      .getPublicUrl(fileName);

    // Limpar arquivo temporário
    try {
      fs.unlinkSync(file.filepath);
    } catch (cleanupError) {
      console.log('Erro ao limpar arquivo temporário:', cleanupError);
    }

    return res.status(200).json({
      success: true,
      url: urlData.publicUrl,
      path: data.path
    });

  } catch (error) {
    console.error('Erro no processamento:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: 'Não foi possível processar o upload. Tente novamente.'
    });
  }
}