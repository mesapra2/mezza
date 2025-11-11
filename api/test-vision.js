/**
 * ========================================
 * TESTE DO GOOGLE VISION API
 * ========================================
 * 
 * Arquivo de teste para verificar se o Google Vision está funcionando
 * Execute: node api/test-vision.js
 */

async function testGoogleVision() {
  try {
    console.log('🔍 Testando Google Vision API...');
    
    // 1. Verificar variáveis de ambiente
    console.log('\n📋 Verificando variáveis de ambiente:');
    console.log('GOOGLE_VISION_PROJECT_ID:', process.env.GOOGLE_VISION_PROJECT_ID ? '✅ Configurado' : '❌ Não configurado');
    console.log('GOOGLE_VISION_CLIENT_EMAIL:', process.env.GOOGLE_VISION_CLIENT_EMAIL ? '✅ Configurado' : '❌ Não configurado');
    console.log('GOOGLE_VISION_PRIVATE_KEY:', process.env.GOOGLE_VISION_PRIVATE_KEY ? '✅ Configurado' : '❌ Não configurado');
    console.log('GOOGLE_VISION_KEY_PATH:', process.env.GOOGLE_VISION_KEY_PATH ? '✅ Configurado' : '❌ Não configurado');
    
    // 2. Tentar importar a biblioteca
    let vision;
    try {
      vision = require('@google-cloud/vision');
      console.log('\n📦 Biblioteca @google-cloud/vision: ✅ Instalada');
    } catch (error) {
      console.log('\n📦 Biblioteca @google-cloud/vision: ❌ NÃO INSTALADA');
      console.log('Execute: npm install @google-cloud/vision');
      return;
    }
    
    // 3. Criar cliente
    let client;
    try {
      if (process.env.GOOGLE_VISION_KEY_PATH) {
        // Usando arquivo JSON
        client = new vision.ImageAnnotatorClient({
          keyFilename: process.env.GOOGLE_VISION_KEY_PATH
        });
        console.log('\n🔑 Cliente criado usando arquivo JSON');
      } else if (process.env.GOOGLE_VISION_PROJECT_ID) {
        // Usando variáveis de ambiente
        client = new vision.ImageAnnotatorClient({
          credentials: {
            type: 'service_account',
            project_id: process.env.GOOGLE_VISION_PROJECT_ID,
            private_key_id: process.env.GOOGLE_VISION_PRIVATE_KEY_ID,
            private_key: process.env.GOOGLE_VISION_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            client_email: process.env.GOOGLE_VISION_CLIENT_EMAIL,
            client_id: process.env.GOOGLE_VISION_CLIENT_ID,
            auth_uri: 'https://accounts.google.com/o/oauth2/auth',
            token_uri: 'https://oauth2.googleapis.com/token',
            auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs'
          }
        });
        console.log('\n🔑 Cliente criado usando variáveis de ambiente');
      } else {
        throw new Error('Nenhuma credencial configurada');
      }
    } catch (error) {
      console.log('\n🔑 Cliente: ❌ Erro ao criar cliente');
      console.log('Erro:', error.message);
      return;
    }
    
    // 4. Teste básico com imagem de exemplo (URL pública)
    console.log('\n🧪 Testando OCR com imagem de exemplo...');
    try {
      // Imagem de teste pública (documento fake para teste)
      const testImageUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
      
      // Fazer OCR de teste
      const [result] = await client.textDetection({
        image: { content: testImageUrl.split(',')[1] }
      });
      
      console.log('✅ OCR funcionando!');
      console.log('Resposta recebida:', result ? 'Dados retornados' : 'Sem dados');
      
      // Se chegou aqui, a API está funcionando
      console.log('\n🎉 GOOGLE VISION API FUNCIONANDO CORRETAMENTE!');
      
    } catch (ocrError) {
      console.log('\n🧪 OCR: ❌ Erro no teste');
      console.log('Erro:', ocrError.message);
      
      // Verificar tipo de erro
      if (ocrError.message.includes('quota')) {
        console.log('💡 Possível problema: Quota da API excedida');
      } else if (ocrError.message.includes('authentication')) {
        console.log('💡 Possível problema: Credenciais incorretas');
      } else if (ocrError.message.includes('permission')) {
        console.log('💡 Possível problema: API Vision não habilitada no projeto');
      }
    }
    
  } catch (error) {
    console.log('\n💥 ERRO GERAL:', error.message);
  }
}

// Executar teste se chamado diretamente
if (require.main === module) {
  // Carregar .env se existir
  try {
    require('dotenv').config();
  } catch (e) {
    console.log('⚠️ dotenv não instalado, usando variáveis de sistema');
  }
  
  testGoogleVision();
}

module.exports = { testGoogleVision };