<?php
require_once 'vendor/autoload.php';
use Twilio\Rest\Client;

$sid = 'AC0b85fd5e429f04fbec403a53d4492684';
$token = '4bec3d5c9ad43210d83d2e1f1b076089';
$twilio = new Client($sid, $token);

try {
  $mensagem = "Teste MesaPra2: Seu código é 123456";
  
  $message = $twilio->messages->create(
    '+5561984656910',  // PARA: número que VAI RECEBER o SMS
    [
      'from' => '+12293047662',  // DE: seu número Twilio
      'body' => $mensagem
    ]
  );
  
  echo "Mensagem enviada! SID: " . $message->sid;
} catch (Exception $e) {
  echo "Erro: " . $e->getMessage();
}