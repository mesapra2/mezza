// api/submit-verification.js
import { createClient } from '@supabase/supabase-js';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

const supabaseUrl = 'https://ksmnfhenhppasfcikefd.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzbW5maGVuaHBwYXNmY2lrZWZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDI0ODU2NywiZXhwIjoyMDc1ODI0NTY3fQ.q_zLwMGb9O-_-xqnxfYDe-8LVUJGqfW8QNGqR1mfEeA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Configurar para não usar bodyParser padrão
export const config = {
  api: {
    bodyParser: false,
  },
};

// Função para upload de arquivo
async function uploadFile(filePath, fileName, bucket = 'verification-documents') {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, fileBuffer, {
        contentType: 'image/jpeg',
        upsert: false
      });

    if (error) {
      console.error('Erro no upload:', error);
      throw error;
    }

    // Obter URL pública
    const { data: publicData } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return publicData.publicUrl;
  } catch (error) {
    console.error('Erro ao fazer upload:', error);
    throw new Error(`Erro no upload: ${error.message}`);
  }
}

// Função para validar CPF
function validateCPF(cpf) {
  const numbers = cpf.replace(/\D/g, '');
  
  if (numbers.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(numbers)) return false;
  
  let sum = 0;
  let remainder;
  
  for (let i = 1; i <= 9; i++) {
    sum = sum + parseInt(numbers.substring(i-1, i)) * (11 - i);
  }
  
  remainder = (sum * 10) % 11;
  if ((remainder === 10) || (remainder === 11)) remainder = 0;
  if (remainder !== parseInt(numbers.substring(9, 10))) return false;
  
  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum = sum + parseInt(numbers.substring(i-1, i)) * (12 - i);
  }
  
  remainder = (sum * 10) % 11;
  if ((remainder === 10) || (remainder === 11)) remainder = 0;
  if (remainder !== parseInt(numbers.substring(10, 11))) return false;
  
  return true;
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
    
    // Extrair dados
    const userId = fields.userId?.[0];
    const cpf = fields.cpf?.[0];
    const documentFront = files.documentFront?.[0];
    const documentBack = files.documentBack?.[0];
    const selfie = files.selfie?.[0];

    // Validações
    if (!userId || !cpf) {
      return res.status(400).json({ 
        error: 'UserId e CPF são obrigatórios' 
      });
    }

    if (!validateCPF(cpf)) {
      return res.status(400).json({ 
        error: 'CPF inválido' 
      });
    }

    if (!documentFront || !documentBack || !selfie) {
      return res.status(400).json({ 
        error: 'Todos os arquivos são obrigatórios (frente, verso, selfie)' 
      });
    }

    // Verificar se usuário já tem verificação pendente ou aprovada
    const { data: existingVerification } = await supabase
      .from('user_verifications')
      .select('status')
      .eq('user_id', userId)
      .single();

    if (existingVerification && ['pending', 'approved'].includes(existingVerification.status)) {
      return res.status(400).json({ 
        error: existingVerification.status === 'approved' 
          ? 'Usuário já verificado'
          : 'Verificação já em andamento'
      });
    }

    // Upload dos arquivos
    const timestamp = Date.now();
    const frontUrl = await uploadFile(
      documentFront.filepath, 
      `${userId}/document_front_${timestamp}.jpg`
    );
    const backUrl = await uploadFile(
      documentBack.filepath, 
      `${userId}/document_back_${timestamp}.jpg`
    );
    const selfieUrl = await uploadFile(
      selfie.filepath, 
      `${userId}/selfie_${timestamp}.jpg`
    );

    // Salvar no banco de dados
    const verificationData = {
      user_id: userId,
      cpf: cpf,
      document_front_url: frontUrl,
      document_back_url: backUrl,
      selfie_url: selfieUrl,
      status: 'pending',
      submitted_at: new Date().toISOString(),
      metadata: {
        ip_address: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        user_agent: req.headers['user-agent'],
        submission_method: 'web'
      }
    };

    const { data, error } = await supabase
      .from('user_verifications')
      .upsert(verificationData, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      console.error('Erro ao salvar verificação:', error);
      throw new Error('Erro ao salvar dados da verificação');
    }

    // Limpar arquivos temporários
    try {
      fs.unlinkSync(documentFront.filepath);
      fs.unlinkSync(documentBack.filepath);
      fs.unlinkSync(selfie.filepath);
    } catch (cleanupError) {
      console.warn('Erro ao limpar arquivos temporários:', cleanupError);
    }

    console.log(`✅ Verificação submetida para usuário ${userId}`);

    res.status(200).json({
      success: true,
      message: 'Verificação enviada com sucesso',
      verificationId: data.id,
      status: data.status
    });

  } catch (error) {
    console.error('❌ Erro na verificação:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
}