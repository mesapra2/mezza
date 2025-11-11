<?php
// send_sms.php - API para envio de SMS em massa via Twilio
header('Content-Type: application/json');
error_reporting(E_ALL);
ini_set('display_errors', 0);

// CORS - Permite requisições de localhost e do próprio domínio
$allowed_origins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://srv1886-files.hstgr.io'
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    header('Access-Control-Allow-Origin: *');
}

header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

// Trata preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Apenas aceita POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método não permitido']);
    exit;
}

require_once __DIR__ . '/vendor/autoload.php';
use Twilio\Rest\Client;

// Credenciais Twilio (as mesmas que você já usa)
$sid = getenv('TWILIO_ACCOUNT_SID');
$token = getenv('TWILIO_AUTH_TOKEN');
$twilioNumber = getenv('TWILIO_PHONE_NUMBER');

// Recebe os dados do POST
$input = json_decode(file_get_contents('php://input'), true);

if (!$input || !isset($input['recipients']) || !isset($input['message'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Dados inválidos']);
    exit;
}

$recipients = $input['recipients']; // Array de objetos com {phone, id}
$message = trim($input['message']);

if (empty($recipients) || empty($message)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Destinatários ou mensagem vazios']);
    exit;
}

// Validação: máximo 160 caracteres
if (strlen($message) > 160) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Mensagem excede 160 caracteres']);
    exit;
}

// Inicializa Twilio
try {
    $twilio = new Client($sid, $token);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erro ao conectar com Twilio: ' . $e->getMessage()]);
    exit;
}

// Arrays para rastrear sucessos e falhas
$sent = [];
$failed = [];

// Caminho do log
$logFile = __DIR__ . '/sms_envio.log';

// Envia SMS para cada destinatário
foreach ($recipients as $recipient) {
    $phone = $recipient['phone'] ?? '';
    $userId = $recipient['id'] ?? 'unknown';
    
    // Valida formato do telefone (aceita vários formatos)
    if (empty($phone) || $phone === 'Sem telefone' || strlen($phone) < 8) {
        $failed[] = ['id' => $userId, 'phone' => $phone, 'error' => 'Telefone inválido ou ausente'];
        continue;
    }
    
    // Remove formatação: (61) 98115-2790 -> 61981152790
    $cleanPhone = preg_replace('/[^0-9+]/', '', $phone);
    
    // Se não começar com +, adiciona +55 (Brasil)
    if (substr($cleanPhone, 0, 1) !== '+') {
        // Remove zero inicial se existir (061 -> 61)
        $cleanPhone = ltrim($cleanPhone, '0');
        
        // Se tiver menos de 10 dígitos, é inválido
        if (strlen($cleanPhone) < 10) {
            $failed[] = ['id' => $userId, 'phone' => $phone, 'error' => 'Número muito curto'];
            continue;
        }
        
        $cleanPhone = '+55' . $cleanPhone;
    }
    
    // Valida formato final: deve ter entre 12-15 caracteres (com +)
    if (strlen($cleanPhone) < 12 || strlen($cleanPhone) > 15) {
        $failed[] = ['id' => $userId, 'phone' => $cleanPhone, 'error' => 'Formato inválido após limpeza'];
        continue;
    }
    
    try {
        // Envia SMS via Twilio
        $twilioMessage = $twilio->messages->create(
            $cleanPhone,
            [
                'from' => $twilioNumber,
                'body' => $message
            ]
        );
        
        // Registra sucesso
        $sent[] = [
            'id' => $userId,
            'phone' => $cleanPhone,
            'sid' => $twilioMessage->sid,
            'status' => $twilioMessage->status
        ];
        
        // Grava no log (formato compatível com o log existente)
        $logEntry = date('Y-m-d H:i:s') . " - Enviado para {$cleanPhone}: {$message}\n";
        file_put_contents($logFile, $logEntry, FILE_APPEND);
        
    } catch (Exception $e) {
        // Registra falha
        $failed[] = [
            'id' => $userId,
            'phone' => $cleanPhone,
            'error' => $e->getMessage()
        ];
        
        // Grava erro no log
        $logEntry = date('Y-m-d H:i:s') . " - ERRO ao enviar para {$cleanPhone}: {$e->getMessage()}\n";
        file_put_contents($logFile, $logEntry, FILE_APPEND);
    }
    
    // Pequeno delay para evitar rate limiting (opcional)
    usleep(100000); // 0.1 segundo
}

// Retorna resultado
$response = [
    'success' => count($sent) > 0,
    'sent' => count($sent),
    'failed' => count($failed),
    'details' => [
        'successful' => $sent,
        'errors' => $failed
    ],
    'message' => sprintf(
        'Enviados: %d | Falhas: %d',
        count($sent),
        count($failed)
    )
];

http_response_code(200);
echo json_encode($response);