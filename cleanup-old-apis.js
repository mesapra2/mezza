// cleanup-old-apis.js - Script para remover APIs antigas após consolidação
import fs from 'fs';
import path from 'path';

const oldApis = [
    'api/send-verification-sms.mjs',
    'api/verify-phone-code.mjs', 
    'api/check-sms-status.mjs',
    'api/sms-webhook.mjs',
    'api/verify-cpf-document.js',
    'api/upload-verification-document.js',
    'api/submit-verification.js',
    'api/submit-mobile-verification.js',
    'api/create-openpix-charge.js',
    'api/openpix-webhook.js',
    'api/test-ocr.js',
    'api/test-vision.js'
];

console.log('🧹 === CLEANUP APIs ANTIGAS ===\n');

let removedCount = 0;
let notFoundCount = 0;

oldApis.forEach(apiPath => {
    if (fs.existsSync(apiPath)) {
        try {
            fs.unlinkSync(apiPath);
            console.log(`✅ Removido: ${apiPath}`);
            removedCount++;
        } catch (error) {
            console.log(`❌ Erro ao remover ${apiPath}:`, error.message);
        }
    } else {
        console.log(`⚠️  Não encontrado: ${apiPath}`);
        notFoundCount++;
    }
});

console.log('\n📊 === RESUMO ===');
console.log(`✅ Removidos: ${removedCount} arquivos`);
console.log(`⚠️  Não encontrados: ${notFoundCount} arquivos`);

// Verificar APIs restantes
console.log('\n📁 === APIs RESTANTES ===');
const apiDir = 'api';
if (fs.existsSync(apiDir)) {
    const remainingFiles = fs.readdirSync(apiDir)
        .filter(file => file.endsWith('.js') || file.endsWith('.mjs'))
        .filter(file => !['README-OG.md'].includes(file));
    
    console.log(`Total de funções serverless: ${remainingFiles.length}`);
    remainingFiles.forEach(file => {
        console.log(`📄 ${file}`);
    });
    
    if (remainingFiles.length <= 12) {
        console.log('\n🎉 SUCESSO! Agora você tem ≤12 funções serverless.');
        console.log('✅ Deploy no Vercel Hobby vai funcionar!');
    } else {
        console.log(`\n⚠️  ATENÇÃO: Ainda há ${remainingFiles.length} funções.`);
        console.log('❌ Limite Hobby é 12. Considere consolidar mais.');
    }
} else {
    console.log('❌ Pasta api/ não encontrada');
}

console.log('\n🚀 === PRÓXIMOS PASSOS ===');
console.log('1. Testar APIs consolidadas localmente');
console.log('2. npm run build');
console.log('3. Deploy no Vercel');
console.log('4. Testar em produção');