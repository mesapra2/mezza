// Verificar status da última mensagem Twilio
const checkLastMessageStatus = async () => {
  console.log('🔍 === VERIFICAR STATUS ÚLTIMA MENSAGEM ===');
  
  try {
    // Enviar SMS e capturar o SID
    const response = await fetch('/api/send-verification-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'status-check-' + Date.now(),
        phone: '61984656910'
      })
    });
    
    const result = await response.json();
    console.log('📱 SMS Response:', result);
    
    if (result.success && result.messageSid) {
      const messageSid = result.messageSid;
      console.log('✅ SMS enviado! SID:', messageSid);
      
      // Verificar status em intervalos
      const checkStatus = async (attempt = 1) => {
        try {
          console.log(`🔍 Tentativa ${attempt}: Verificando status...`);
          
          const statusResponse = await fetch('/api/check-sms-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messageSid })
          });
          
          if (!statusResponse.ok) {
            console.log('❌ Erro ao verificar status:', statusResponse.status);
            return;
          }
          
          const statusData = await statusResponse.json();
          console.log(`📊 Status (Tentativa ${attempt}):`, statusData);
          
          if (statusData.success && statusData.message) {
            const msg = statusData.message;
            
            console.log(`📱 Status: ${msg.status}`);
            console.log(`📞 De: ${msg.from} Para: ${msg.to}`);
            console.log(`💰 Preço: ${msg.price || '0'} ${msg.priceUnit || ''}`);
            console.log(`📅 Criado: ${msg.dateCreated}`);
            console.log(`📤 Enviado: ${msg.dateSent || 'Pendente'}`);
            console.log(`🔄 Atualizado: ${msg.dateUpdated}`);
            
            if (msg.errorCode) {
              console.log(`❌ ERRO TWILIO: ${msg.errorCode} - ${msg.errorMessage}`);
              
              // Interpretar erros específicos
              const errorExplanations = {
                '21211': '❌ Número inválido ou não é móvel',
                '21614': '❌ Número não pode receber SMS (bloqueado pela operadora)',
                '21610': '❌ Número está em blacklist',
                '30034': '❌ Operadora brasileira rejeitou a mensagem',
                '30035': '❌ Número desconhecido ou inválido',
                '21408': '❌ Permissões insuficientes para enviar SMS internacional',
                '21215': '❌ Número não está habilitado para receber SMS'
              };
              
              const explanation = errorExplanations[msg.errorCode] || `❌ Erro Twilio: ${msg.errorMessage}`;
              console.log('📋 Explicação:', explanation);
              alert(explanation);
              
            } else {
              // Status sem erro
              if (msg.status === 'delivered') {
                console.log('🎉 SMS FOI ENTREGUE COM SUCESSO!');
                alert('🎉 SMS entregue!');
              } else if (msg.status === 'failed') {
                console.log('💥 SMS FALHOU na entrega');
                alert('💥 SMS falhou na entrega');
              } else if (msg.status === 'sent') {
                console.log('📤 SMS enviado para operadora, aguardando...');
                if (attempt < 4) {
                  setTimeout(() => checkStatus(attempt + 1), 10000);
                } else {
                  alert('📤 SMS enviado mas ainda pendente. Pode demorar alguns minutos.');
                }
              } else if (msg.status === 'queued') {
                console.log('⏳ SMS na fila, aguardando...');
                if (attempt < 3) {
                  setTimeout(() => checkStatus(attempt + 1), 5000);
                }
              } else {
                console.log(`📊 Status atual: ${msg.status}`);
                alert(`📊 Status: ${msg.status}`);
              }
            }
          }
          
        } catch (error) {
          console.log('💥 Erro ao verificar status:', error);
        }
      };
      
      // Primeira verificação após 5 segundos
      setTimeout(() => checkStatus(), 5000);
      
    } else {
      console.log('❌ Falha no envio:', result.error);
      alert('❌ Erro: ' + result.error);
    }
    
  } catch (error) {
    console.error('💥 Erro:', error);
    alert('💥 Erro: ' + error.message);
  }
};

// Executar
checkLastMessageStatus();

window.checkLastMessageStatus = checkLastMessageStatus;