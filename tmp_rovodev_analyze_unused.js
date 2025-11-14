// Script para analisar arquivos não utilizados
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Arquivos e diretórios para analisar
const sourceDir = 'src';
const publicDir = 'public';
const apiDir = 'api';

// Extensões de arquivo relevantes
const extensions = ['.js', '.jsx', '.ts', '.tsx', '.css', '.json', '.md'];

// Coletar todos os arquivos
function getAllFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            getAllFiles(filePath, fileList);
        } else if (extensions.some(ext => file.endsWith(ext))) {
            fileList.push(filePath);
        }
    });
    
    return fileList;
}

// Extrair imports de um arquivo
function extractImports(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const imports = [];
        
        // Regex para diferentes tipos de import
        const patterns = [
            /import\s+.*?from\s+['"`]([^'"`]+)['"`]/g,
            /import\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
            /require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
        ];
        
        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                imports.push(match[1]);
            }
        });
        
        return imports;
    } catch (error) {
        return [];
    }
}

// Analisar uso de arquivos
function analyzeUsage() {
    console.log('🔍 === ANÁLISE DE ARQUIVOS NÃO UTILIZADOS ===\n');
    
    const allFiles = getAllFiles(sourceDir);
    const imports = new Set();
    const fileUsage = new Map();
    
    // Inicializar contadores
    allFiles.forEach(file => {
        fileUsage.set(file, 0);
    });
    
    // Coletar todos os imports
    allFiles.forEach(file => {
        const fileImports = extractImports(file);
        fileImports.forEach(imp => {
            imports.add(imp);
            
            // Resolver caminho do import
            const resolvedPath = resolveImportPath(file, imp);
            if (resolvedPath && fileUsage.has(resolvedPath)) {
                fileUsage.set(resolvedPath, fileUsage.get(resolvedPath) + 1);
            }
        });
    });
    
    // Identificar arquivos não utilizados
    const unused = [];
    const used = [];
    
    fileUsage.forEach((count, file) => {
        if (count === 0) {
            unused.push(file);
        } else {
            used.push({ file, count });
        }
    });
    
    return { unused, used, total: allFiles.length };
}

// Resolver caminho do import
function resolveImportPath(fromFile, importPath) {
    if (importPath.startsWith('.')) {
        const dir = path.dirname(fromFile);
        let resolved = path.resolve(dir, importPath);
        
        // Tentar diferentes extensões
        for (const ext of extensions) {
            if (fs.existsSync(resolved + ext)) {
                return resolved + ext;
            }
        }
        
        // Tentar index
        if (fs.existsSync(path.join(resolved, 'index.jsx'))) {
            return path.join(resolved, 'index.jsx');
        }
        if (fs.existsSync(path.join(resolved, 'index.js'))) {
            return path.join(resolved, 'index.js');
        }
    }
    
    return null;
}

// Executar análise
const results = analyzeUsage();

console.log(`📊 TOTAL DE ARQUIVOS: ${results.total}`);
console.log(`✅ UTILIZADOS: ${results.used.length}`);
console.log(`❌ NÃO UTILIZADOS: ${results.unused.length}\n`);

if (results.unused.length > 0) {
    console.log('🗑️ === ARQUIVOS NÃO UTILIZADOS ===');
    results.unused.forEach(file => {
        console.log(`❌ ${file}`);
    });
}

console.log('\n📈 === ARQUIVOS MAIS UTILIZADOS ===');
results.used
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .forEach(({ file, count }) => {
        console.log(`✅ ${file} (${count} imports)`);
    });

export { analyzeUsage };