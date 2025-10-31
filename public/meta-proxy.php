<?php
/**
 * META-PROXY.PHP - VERSÃO SIMPLIFICADA
 * Serve meta tags Open Graph estáticas para todos os eventos
 */

header('Content-Type: text/html; charset=utf-8');

// ===== CONFIGURAÇÕES =====
$APP_URL = 'https://app.mesapra2.com';
$DEFAULT_IMAGE = $APP_URL . '/og-default.jpg';

// ===== DETECTAR SE É BOT =====
function isBot() {
    $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';
    $bots = [
        'facebookexternalhit',
        'WhatsApp',
        'Twitterbot',
        'LinkedInBot',
        'Slackbot',
        'TelegramBot',
        'SkypeUriPreview',
        'Google-PageRenderer',
        'Discordbot'
    ];
    
    foreach ($bots as $bot) {
        if (stripos($userAgent, $bot) !== false) {
            return true;
        }
    }
    return false;
}

// ===== LOG PARA DEBUG =====
$logFile = __DIR__ . '/meta-proxy.log';
$logMsg = date('Y-m-d H:i:s') . ' | User-Agent: ' . ($_SERVER['HTTP_USER_AGENT'] ?? 'unknown') . ' | IsBot: ' . (isBot() ? 'YES' : 'NO') . "\n";
file_put_contents($logFile, $logMsg, FILE_APPEND);

// ===== DADOS PADRÃO =====
$title = 'Mesapra2 - Social Dining';
$description = 'Conectando pessoas através de experiências gastronômicas únicas';
$image = $DEFAULT_IMAGE;
$url = $APP_URL;

// ===== SE FOR EVENTO ESPECÍFICO =====
$eventId = isset($_GET['event_id']) ? intval($_GET['event_id']) : null;

if ($eventId) {
    $title = "Evento #$eventId no Mesapra2";
    $description = "Participe deste evento incrível! Conecte-se com pessoas através de experiências gastronômicas únicas.";
    $url = $APP_URL . '/event/' . $eventId;
}

// ===== SE NÃO FOR BOT, REDIRECIONAR PARA O REACT =====
if (!isBot()) {
    // Redireciona para o React App sem quebrar o Router
    header('Location: ' . $url);
    exit;
}

// ===== RENDERIZAR HTML COM META TAGS PARA BOTS =====
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <!-- Basic Meta -->
    <title><?php echo htmlspecialchars($title); ?></title>
    <meta name="description" content="<?php echo htmlspecialchars($description); ?>">
    
    <!-- Open Graph / Facebook / WhatsApp -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="<?php echo htmlspecialchars($url); ?>">
    <meta property="og:title" content="<?php echo htmlspecialchars($title); ?>">
    <meta property="og:description" content="<?php echo htmlspecialchars($description); ?>">
    <meta property="og:image" content="<?php echo htmlspecialchars($image); ?>">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:type" content="image/jpeg">
    <meta property="og:image:alt" content="<?php echo htmlspecialchars($title); ?>">
    <meta property="og:site_name" content="Mesapra2">
    <meta property="og:locale" content="pt_BR">
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:url" content="<?php echo htmlspecialchars($url); ?>">
    <meta name="twitter:title" content="<?php echo htmlspecialchars($title); ?>">
    <meta name="twitter:description" content="<?php echo htmlspecialchars($description); ?>">
    <meta name="twitter:image" content="<?php echo htmlspecialchars($image); ?>">
    
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { color: #667eea; }
        .debug {
            background: #f0f0f0;
            padding: 10px;
            margin-top: 20px;
            border-radius: 5px;
            font-size: 12px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1><?php echo htmlspecialchars($title); ?></h1>
        <p><?php echo htmlspecialchars($description); ?></p>
        <p><a href="<?php echo htmlspecialchars($url); ?>">Acessar no app →</a></p>
        
        <div class="debug">
            <strong>🤖 Debug Info:</strong><br>
            User-Agent: <?php echo htmlspecialchars($_SERVER['HTTP_USER_AGENT'] ?? 'unknown'); ?><br>
            Is Bot: <?php echo isBot() ? 'YES' : 'NO'; ?><br>
            Event ID: <?php echo $eventId ?: 'none'; ?><br>
            Image: <?php echo htmlspecialchars($image); ?>
        </div>
    </div>
</body>
</html>