// api/submit-mobile-verification.js
import { createClient } from '@supabase/supabase-js';
import formidable from 'formidable';
import fs from 'fs';

const supabaseUrl = 'https://ksmnfhenhppasfcikefd.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzbW5maGVuaHBwYXNmY2lrZWZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDI0ODU2NywiZXhwIjoyMDc1ODI0NTY3fQ.q_zLwMGb9O-_-xqnxfYDe-8LVUJGqfW8QNGqR1mfEeA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const config = {
  api: {
    bodyParser: false,
  },
};

async function uploadFile(filePath, fileName, bucket = 'verification-documents') {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, fileBuffer, {
        contentType: 'image/jpeg',
        upsert: false
      });

    if (error) throw error;

    const { data: publicData } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return publicData.publicUrl;
  } catch (error) {
    console.error('Erro ao fazer upload:', error);
    throw new Error(`Erro no upload: ${error.message}`);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const form = formidable({
      maxFileSize: 5 * 1024 * 1024, // 5MB
      maxFiles: 3,
      allowEmptyFiles: false,
    });

    const [fields, files] = await form.parse(req);
    
    const userId = fields.userId?.[0];
    const sessionId = fields.sessionId?.[0];
    const documentFront = files.documentFront?.[0];
    const documentBack = files.documentBack?.[0];
    const selfie = files.selfie?.[0];

    // Validações
    if (!userId || !sessionId) {
      return res.status(400).json({ 
        error: 'UserId e SessionId são obrigatórios' 
      });
    }

    if (!documentFront || !documentBack || !selfie) {
      return res.status(400).json({ 
        error: 'Todos os arquivos são obrigatórios' 
      });
    }

    // Buscar dados do CPF da verificação existente
    const { data: existingVerification, error: fetchError } = await supabase
      .from('user_verifications')
      .select('cpf, status')
      .eq('user_id', userId)
      .single();

    if (fetchError || !existingVerification) {
      return res.status(404).json({ 
        error: 'Verificação não iniciada. Complete o CPF primeiro.' 
      });
    }

    if (existingVerification.status === 'approved') {
      return res.status(400).json({ 
        error: 'Usuário já verificado' 
      });
    }

    // Upload dos arquivos mobile
    const timestamp = Date.now();
    const frontUrl = await uploadFile(
      documentFront.filepath, 
      `${userId}/mobile_document_front_${timestamp}.jpg`
    );
    const backUrl = await uploadFile(
      documentBack.filepath, 
      `${userId}/mobile_document_back_${timestamp}.jpg`
    );
    const selfieUrl = await uploadFile(
      selfie.filepath, 
      `${userId}/mobile_selfie_${timestamp}.jpg`
    );

    // Atualizar verificação com as fotos mobile
    const { data, error } = await supabase
      .from('user_verifications')
      .update({
        document_front_url: frontUrl,
        document_back_url: backUrl,
        selfie_url: selfieUrl,
        status: 'pending',
        submitted_at: new Date().toISOString(),
        metadata: {
          ip_address: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
          user_agent: req.headers['user-agent'],
          submission_method: 'mobile',
          session_id: sessionId
        }
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar verificação:', error);
      throw new Error('Erro ao salvar fotos da verificação');
    }

    // Limpar arquivos temporários
    try {
      fs.unlinkSync(documentFront.filepath);
      fs.unlinkSync(documentBack.filepath);
      fs.unlinkSync(selfie.filepath);
    } catch (cleanupError) {
      console.warn('Erro ao limpar arquivos temporários:', cleanupError);
    }

    console.log(`✅ Fotos mobile enviadas para verificação do usuário ${userId}`);

    res.status(200).json({
      success: true,
      message: 'Fotos enviadas com sucesso',
      verificationId: data.id,
      status: data.status
    });

  } catch (error) {
    console.error('❌ Erro na verificação mobile:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
}