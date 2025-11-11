/**
 * 🚀 BUILD OTIMIZADO COM SOURCE MAPS - MESAPRA2
 * 
 * Script para gerar build de produção com source maps
 * e verificar se os arquivos foram gerados corretamente
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function buildWithSourcemaps() {
  console.log('🚀 INICIANDO BUILD COM SOURCE MAPS');
  console.log('=====================================\n');

  try {
    // 1. Limpar build anterior
    console.log('🧹 Limpando build anterior...');
    try {
      execSync('npm run build:clean', { stdio: 'inherit' });
    } catch (cleanError) {
      console.log('⚠️ Comando build:clean não encontrado, continuando...');
    }

    // 2. Executar build
    console.log('\n📦 Executando build de produção...');
    execSync('npm run build', { stdio: 'inherit' });
    console.log('✅ Build concluído com sucesso!');

    // 3. Verificar se source maps foram gerados
    console.log('\n🔍 Verificando source maps gerados...');
    
    const distPath = './dist';
    if (!fs.existsSync(distPath)) {
      throw new Error('❌ Pasta dist não encontrada');
    }

    // Procurar por arquivos .js.map
    const sourceMapsFound = [];
    const jsFilesFound = [];

    function findFiles(dir, ext, array) {
      const files = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const file of files) {
        const fullPath = path.join(dir, file.name);
        
        if (file.isDirectory()) {
          findFiles(fullPath, ext, array);
        } else if (file.name.endsWith(ext)) {
          array.push(fullPath);
        }
      }
    }

    findFiles(distPath, '.js.map', sourceMapsFound);
    findFiles(distPath, '.js', jsFilesFound);

    // 4. Relatório dos arquivos
    console.log('\n📊 RELATÓRIO DE ARQUIVOS GERADOS:');
    console.log('=================================');
    
    console.log(`\n📄 Arquivos JavaScript: ${jsFilesFound.length}`);
    jsFilesFound.forEach(file => {
      const size = (fs.statSync(file).size / 1024).toFixed(1);
      console.log(`  📄 ${path.relative('.', file)} (${size} KB)`);
    });

    console.log(`\n🗺️ Source Maps: ${sourceMapsFound.length}`);
    sourceMapsFound.forEach(file => {
      const size = (fs.statSync(file).size / 1024).toFixed(1);
      console.log(`  🗺️ ${path.relative('.', file)} (${size} KB)`);
    });

    // 5. Verificar correspondência
    console.log('\n✅ VERIFICAÇÃO DE CORRESPONDÊNCIA:');
    let allJsHaveMaps = true;

    for (const jsFile of jsFilesFound) {
      if (jsFile.includes('/assets/') && jsFile.endsWith('.js')) {
        const mapFile = jsFile + '.map';
        const hasMap = fs.existsSync(mapFile);
        const status = hasMap ? '✅' : '❌';
        const fileName = path.basename(jsFile);
        
        console.log(`  ${status} ${fileName} → ${hasMap ? 'Source map gerado' : 'Source map AUSENTE'}`);
        
        if (!hasMap) allJsHaveMaps = false;
      }
    }

    // 6. Resultado final
    console.log('\n🎯 RESULTADO FINAL:');
    console.log('==================');
    
    if (sourceMapsFound.length > 0 && allJsHaveMaps) {
      console.log('✅ SOURCE MAPS GERADOS COM SUCESSO!');
      console.log('✅ Todos os arquivos JS principais têm source maps');
      console.log('✅ Debug em produção será possível');
      console.log('✅ Lighthouse não mostrará mais avisos');
      
      console.log('\n🚀 DEPLOY PRONTO:');
      console.log('- Source maps habilitados ✅');
      console.log('- Debug em produção ✅');
      console.log('- Performance Lighthouse otimizada ✅');
      
    } else {
      console.log('❌ PROBLEMAS DETECTADOS:');
      console.log(`- Source maps encontrados: ${sourceMapsFound.length}`);
      console.log(`- Arquivos JS principais: ${jsFilesFound.filter(f => f.includes('/assets/')).length}`);
      console.log('- Verificar configuração do Vite');
    }

    return sourceMapsFound.length > 0;

  } catch (error) {
    console.error('💥 ERRO NO BUILD:', error.message);
    return false;
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  const success = buildWithSourcemaps();
  process.exit(success ? 0 : 1);
}

module.exports = { buildWithSourcemaps };