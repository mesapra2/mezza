/**
 * ========================================
 * API: Verificação de CPF em Documentos
 * ========================================
 * 
 * API para verificar se o CPF informado corresponde ao documento fotografado
 * usando OCR ou integração com serviços de verificação
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { userId, cpfInformado, documentFrontUrl, documentBackUrl, selfieUrl } = req.body;

    if (!userId || !cpfInformado || !documentFrontUrl || !selfieUrl) {
      return res.status(400).json({ 
        error: 'Dados obrigatórios: userId, cpfInformado, documentFrontUrl, selfieUrl' 
      });
    }

    // Simular verificação de CPF (aqui você integraria com um serviço de OCR real)
    const cpfExtraido = await extrairCPFDoDocumento(documentFrontUrl);
    
    // Verificar se o CPF informado corresponde ao extraído do documento
    const cpfValido = validarCPF(cpfInformado, cpfExtraido);
    
    if (!cpfValido) {
      // Atualizar status como rejeitado
      await supabase
        .from('user_verifications')
        .upsert({
          user_id: userId,
          cpf: cpfInformado,
          document_front_url: documentFrontUrl,
          document_back_url: documentBackUrl,
          selfie_url: selfieUrl,
          status: 'rejected',
          rejection_reason: 'CPF informado não corresponde ao documento apresentado',
          submitted_at: new Date().toISOString(),
          metadata: {
            cpf_informado: cpfInformado,
            cpf_extraido: cpfExtraido,
            verificacao_automatica: true
          }
        });

      return res.status(400).json({
        success: false,
        message: 'CPF não confere com o documento. Por favor, refaça o processo.',
        shouldRetry: true
      });
    }

    // CPF válido - aprovar automaticamente
    await supabase
      .from('user_verifications')
      .upsert({
        user_id: userId,
        cpf: cpfInformado,
        document_front_url: documentFrontUrl,
        document_back_url: documentBackUrl,
        selfie_url: selfieUrl,
        status: 'approved',
        submitted_at: new Date().toISOString(),
        reviewed_at: new Date().toISOString(),
        metadata: {
          cpf_informado: cpfInformado,
          cpf_extraido: cpfExtraido,
          verificacao_automatica: true
        }
      });

    // Atualizar profile como verificado
    await supabase
      .from('profiles')
      .update({ is_verified: true })
      .eq('id', userId);

    return res.status(200).json({
      success: true,
      message: 'Documentos verificados com sucesso! Sua conta foi verificada.',
      status: 'approved'
    });

  } catch (error) {
    console.error('Erro na verificação:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: 'Não foi possível processar a verificação. Tente novamente.'
    });
  }
}

/**
 * Extrair CPF do documento usando Google Vision API
 */
async function extrairCPFDoDocumento(imageUrl) {
  try {
    // Importar Google Vision API
    const vision = require('@google-cloud/vision');
    
    // Configuração das credenciais MesaPra2
    const credentials = {
      type: 'service_account',
      project_id: process.env.GOOGLE_VISION_PROJECT_ID || 'mesapra2-ff033',
      private_key_id: process.env.GOOGLE_VISION_PRIVATE_KEY_ID,
      private_key: process.env.GOOGLE_VISION_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.GOOGLE_VISION_CLIENT_EMAIL || 'vision-oi-key@mesapra2-ff033.iam.gserviceaccount.com',
      client_id: process.env.GOOGLE_VISION_CLIENT_ID || '115423317070757943479',
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(process.env.GOOGLE_VISION_CLIENT_EMAIL || 'vision-oi-key@mesapra2-ff033.iam.gserviceaccount.com')}`
    };

    console.log('🔧 Configurando Google Vision API:', {
      project_id: credentials.project_id,
      client_email: credentials.client_email,
      client_id: credentials.client_id,
      has_private_key: !!credentials.private_key,
      private_key_configured: credentials.private_key ? 'SIM' : 'AGUARDANDO'
    });

    // Criar cliente Vision API usando o arquivo JSON encontrado
    const keyPath = './KEYS/mesapra2-ff033-0cfe7b7a3faa.json';
    
    let client;
    try {
      // Primeira opção: usar arquivo JSON local
      const fs = require('fs');
      if (fs.existsSync(keyPath)) {
        client = new vision.ImageAnnotatorClient({
          keyFilename: keyPath
        });
        console.log('✅ Cliente Google Vision criado usando arquivo JSON local');
      } else if (process.env.GOOGLE_VISION_KEY_PATH) {
        // Segunda opção: usar path de environment
        client = new vision.ImageAnnotatorClient({
          keyFilename: process.env.GOOGLE_VISION_KEY_PATH
        });
        console.log('✅ Cliente criado usando GOOGLE_VISION_KEY_PATH');
      } else if (credentials.private_key) {
        // Terceira opção: usar credenciais inline
        client = new vision.ImageAnnotatorClient({
          credentials: credentials
        });
        console.log('✅ Cliente criado usando credenciais inline');
      } else {
        throw new Error('❌ Nenhuma credencial do Google Vision encontrada');
      }
    } catch (error) {
      console.error('❌ Erro ao criar cliente Google Vision:', error.message);
      throw new Error('Falha na configuração do Google Vision: ' + error.message);
    }

    // Baixar a imagem
    const response = await fetch(imageUrl);
    const imageBuffer = await response.arrayBuffer();
    
    // Fazer OCR da imagem
    const [result] = await client.textDetection({
      image: { content: Buffer.from(imageBuffer).toString('base64') }
    });
    
    const detections = result.textAnnotations;
    const fullText = detections[0]?.description || '';
    
    console.log('Texto extraído do documento:', fullText);
    
    // Procurar por padrões de CPF no texto
    const cpfPatterns = [
      /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, // Formato: 123.456.789-01
      /\b\d{11}\b/g, // Formato: 12345678901
      /CPF[:\s]*(\d{3}\.?\d{3}\.?\d{3}-?\d{2})/gi, // Precedido por "CPF:"
      /RG[:\s]*\d+.*?CPF[:\s]*(\d{3}\.?\d{3}\.?\d{3}-?\d{2})/gi, // Em documentos RG
    ];
    
    for (const pattern of cpfPatterns) {
      const matches = fullText.match(pattern);
      if (matches) {
        for (const match of matches) {
          const cpfNumbers = match.replace(/\D/g, '');
          
          // Validar se tem 11 dígitos e não é sequência
          if (cpfNumbers.length === 11 && !/^(\d)\1+$/.test(cpfNumbers)) {
            // Validar dígitos verificadores
            if (validarDigitosVerificadoresCPF(cpfNumbers)) {
              console.log('CPF válido encontrado:', cpfNumbers);
              return cpfNumbers;
            }
          }
        }
      }
    }
    
    console.log('Nenhum CPF válido encontrado no documento');
    return null;
    
  } catch (error) {
    console.error('Erro no OCR:', error);
    
    // Fallback: retornar null em caso de erro
    // Em produção, você pode implementar retry ou métodos alternativos
    return null;
  }
}

/**
 * Validar dígitos verificadores do CPF
 */
function validarDigitosVerificadoresCPF(cpf) {
  // Primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf[i]) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf[9])) return false;
  
  // Segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf[i]) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf[10])) return false;
  
  return true;
}

/**
 * Validar se o CPF informado corresponde ao extraído
 */
function validarCPF(cpfInformado, cpfExtraido) {
  if (!cpfExtraido) return false;
  
  // Remover formatação
  const cpf1 = cpfInformado.replace(/\D/g, '');
  const cpf2 = cpfExtraido.replace(/\D/g, '');
  
  return cpf1 === cpf2;
}

/**
 * Verificar se o CPF é uma sequência (111.111.111-11, etc.)
 */
function isSequencialCPF(cpf) {
  return /^(\d)\1+$/.test(cpf);
}

/**
 * Mascarar CPF para logs de segurança
 */
function maskCPF(cpf) {
  if (!cpf || cpf.length !== 11) return 'CPF inválido';
  return `${cpf.substring(0, 3)}.***.**${cpf.substring(9, 11)}`;
}

/**
 * Validar formato e dígitos verificadores do CPF
 */
function validarFormatoCPF(cpf) {
  const numbers = cpf.replace(/\D/g, '');
  
  if (numbers.length !== 11 || /^(\d)\1+$/.test(numbers)) {
    return false;
  }
  
  // Validar dígitos verificadores
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(numbers[i]) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(numbers[9])) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(numbers[i]) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(numbers[10])) return false;
  
  return true;
}