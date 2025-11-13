<?php
/**
 * load_env.php
 * Script simples para carregar variáveis de ambiente do arquivo .env
 * USO: require_once 'load_env.php';
 */

function loadEnvironmentVariables($filePath = '.env') {
    // Procurar .env na raiz do projeto
    if (!file_exists($filePath)) {
        $filePath = __DIR__ . '/.env';
    }
    
    if (!file_exists($filePath)) {
        $filePath = dirname(__DIR__) . '/.env';
    }
    
    if (!file_exists($filePath)) {
        throw new Exception("❌ Arquivo .env não encontrado! Crie um arquivo .env na raiz do projeto.");
    }
    
    $lines = file($filePath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    
    foreach ($lines as $line) {
        // Ignorar comentários
        if (strpos(trim($line), '#') === 0) {
            continue;
        }
        
        // Dividir em nome=valor
        if (strpos($line, '=') !== false) {
            list($name, $value) = explode('=', $line, 2);
            
            $name = trim($name);
            $value = trim($value);
            
            // Remover aspas se existirem
            $value = trim($value, '"\'');
            
            // Definir variável de ambiente
            if (!array_key_exists($name, $_SERVER) && !array_key_exists($name, $_ENV)) {
                putenv("$name=$value");
                $_ENV[$name] = $value;
                $_SERVER[$name] = $value;
            }
        }
    }
}

// Carregar automaticamente quando o arquivo é incluído
try {
    loadEnvironmentVariables();
} catch (Exception $e) {
    die($e->getMessage());
}

// Função helper para pegar variáveis de ambiente
function env($key, $default = null) {
    $value = getenv($key);
    
    if ($value === false) {
        return $default;
    }
    
    // Converter strings de booleanos
    if (strtolower($value) === 'true') return true;
    if (strtolower($value) === 'false') return false;
    if (strtolower($value) === 'null') return null;
    
    return $value;
}
?>