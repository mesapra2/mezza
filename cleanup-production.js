#!/usr/bin/env node
// cleanup-production.js - Limpeza automática para produção
import fs from 'fs';
import path from 'path';

console.log('🧹 === LIMPEZA PARA PRODUÇÃO ===\n');

// Arquivos a serem removidos
const filesToRemove = [
    // Arquivos de teste
    'src/components/CertifiedUserTest.jsx',
    'src/components/TestVerificationFlow.jsx',
    'src/features/shared/pages/Chat.test.jsx',
    'src/pages/test-certified-user.jsx',
    'src/services/PartnerEventService.test.ts',
    'src/services/PushNotificationService.test.ts',
    'src/services/RatingService.test.ts',
    'src/services/TrustScoreService.test.ts',
    'src/services/WaitingListService.test.ts',
    'src/setupTests.ts',
    'src/test/setup.js',
    
    // Arquivos backup/temp
    'src/features/shared/pages/EventChatPage.backup.jsx',
    'src/features/shared/pages/Peoplepage.temp.jsx',
    'src/features/shared/pages/MobileVerificationPage.jsx.backup',
    
    // Componentes não utilizados
    'src/features/partner/components/LatestAnnouncements.jsx',
    'src/components/DocumentVerification.jsx',
    'src/utils/supabaseClient.js',
    'src/features/shared/pages/signup.jsx',
    'src/ProtectedRoutes.jsx',
    
    // Docs desnecessários
    'src/config/SKILL.md',
    'src/features/shared/components/profile/README-Instagram.md',
    
    // APIs antigas (consolidadas)
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
    'api/test-vision.js',
    
    // Duplicados
    'src/services/PresenceService.js', // usar .ts
    'src/utils/utils.js', // usar lib/utils.ts
];

// Diretórios a serem removidos
const dirsToRemove = [
    'src/utils/abi',
    'src/test',
];

let removed = 0;
let notFound = 0;
let errors = 0;

console.log('📁 Removendo arquivos...\n');

// Remover arquivos
filesToRemove.forEach(filePath => {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`✅ ${filePath}`);
            removed++;
        } else {
            console.log(`⚠️  ${filePath} (não encontrado)`);
            notFound++;
        }
    } catch (error) {
        console.log(`❌ ${filePath} (erro: ${error.message})`);
        errors++;
    }
});

// Remover diretórios
console.log('\n📂 Removendo diretórios...\n');

dirsToRemove.forEach(dirPath => {
    try {
        if (fs.existsSync(dirPath)) {
            fs.rmSync(dirPath, { recursive: true, force: true });
            console.log(`✅ ${dirPath}/`);
            removed++;
        } else {
            console.log(`⚠️  ${dirPath}/ (não encontrado)`);
            notFound++;
        }
    } catch (error) {
        console.log(`❌ ${dirPath}/ (erro: ${error.message})`);
        errors++;
    }
});

// Relatório final
console.log('\n📊 === RELATÓRIO FINAL ===');
console.log(`✅ Removidos: ${removed}`);
console.log(`⚠️  Não encontrados: ${notFound}`);
console.log(`❌ Erros: ${errors}`);

if (removed > 0) {
    console.log('\n🎉 LIMPEZA CONCLUÍDA!');
    console.log('📦 Bundle será menor');
    console.log('⚡ Build será mais rápido');
    console.log('🚀 Deploy otimizado');
    
    console.log('\n📋 Próximos passos:');
    console.log('1. npm run build');
    console.log('2. Testar se tudo funciona');
    console.log('3. Deploy para produção');
} else {
    console.log('\n⚠️  Nenhum arquivo foi removido');
}

// Verificar tamanho da pasta src
try {
    const srcStats = fs.statSync('src');
    console.log(`\n📁 Pasta src/ otimizada`);
} catch (error) {
    console.log('❌ Erro ao verificar pasta src/');
}

// Verificar APIs restantes
try {
    const apiFiles = fs.readdirSync('api/')
        .filter(f => f.endsWith('.js') || f.endsWith('.mjs'))
        .length;
    console.log(`\n📡 APIs restantes: ${apiFiles} (limite Vercel: 12)`);
    
    if (apiFiles <= 12) {
        console.log('✅ Dentro do limite do Vercel Hobby!');
    } else {
        console.log('❌ Ainda acima do limite - considere mais consolidação');
    }
} catch (error) {
    console.log('⚠️  Não foi possível verificar APIs');
}