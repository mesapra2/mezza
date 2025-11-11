// api/openpix-webhook.js
import { supabase } from '../src/lib/supabaseClient.js';
import crypto from 'crypto';

export default async function handler(req, res) {
  // Apenas métodos POST são permitidos
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const payload = JSON.stringify(req.body);
    const signature = req.headers['x-openpix-signature'];

    // Verificar assinatura do webhook (segurança)
    const expectedSignature = crypto
      .createHmac('sha256', process.env.OPENPIX_WEBHOOK_SECRET || process.env.VITE_OPENPIX_WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.error('Assinatura do webhook inválida');
      return res.status(401).json({ error: 'Assinatura inválida' });
    }

    const { event, charge } = req.body;

    console.log('Webhook OpenPix recebido:', { event, chargeId: charge?.id });

    // Processar apenas eventos de pagamento
    if (event === 'charge:completed' && charge?.status === 'COMPLETED') {
      await processPaymentCompleted(charge);
    } else if (event === 'charge:expired' && charge?.status === 'EXPIRED') {
      await processPaymentExpired(charge);
    }

    return res.status(200).json({ received: true });

  } catch (error) {
    console.error('Erro no webhook:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
}

/**
 * Processar pagamento concluído
 */
async function processPaymentCompleted(charge) {
  try {
    console.log('Processando pagamento concluído:', charge.id);

    // Buscar registro da cobrança no banco
    const { data: chargeRecord, error: findError } = await supabase
      .from('premium_charges')
      .select('*')
      .eq('charge_id', charge.id)
      .single();

    if (findError || !chargeRecord) {
      console.error('Cobrança não encontrada no banco:', charge.id);
      return;
    }

    // Atualizar status da cobrança
    await supabase
      .from('premium_charges')
      .update({
        status: 'completed',
        paid_at: new Date().toISOString(),
        openpix_data: charge
      })
      .eq('id', chargeRecord.id);

    // Ativar premium para o usuário
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({
        is_premium: true,
        premium_activated_at: new Date().toISOString(),
        premium_plan: chargeRecord.plan_type,
        updated_at: new Date().toISOString()
      })
      .eq('id', chargeRecord.user_id)
      .select()
      .single();

    if (updateError) {
      console.error('Erro ao ativar premium:', updateError);
      return;
    }

    console.log('✅ Premium ativado para usuário:', chargeRecord.user_id);

    // Enviar notificação de boas-vindas
    await sendWelcomePremiumNotification(chargeRecord.user_id, updatedProfile.username);

    // Log de sucesso
    await supabase
      .from('premium_activations_log')
      .insert({
        user_id: chargeRecord.user_id,
        charge_id: charge.id,
        plan_type: chargeRecord.plan_type,
        amount: chargeRecord.amount,
        activated_at: new Date().toISOString()
      });

  } catch (error) {
    console.error('Erro ao processar pagamento concluído:', error);
  }
}

/**
 * Processar pagamento expirado
 */
async function processPaymentExpired(charge) {
  try {
    console.log('Processando pagamento expirado:', charge.id);

    // Atualizar status da cobrança
    await supabase
      .from('premium_charges')
      .update({
        status: 'expired',
        openpix_data: charge
      })
      .eq('charge_id', charge.id);

    console.log('✅ Cobrança marcada como expirada:', charge.id);

  } catch (error) {
    console.error('Erro ao processar pagamento expirado:', error);
  }
}

/**
 * Enviar notificação de boas-vindas premium
 */
async function sendWelcomePremiumNotification(userId, username) {
  try {
    // Criar notificação no sistema
    await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type: 'premium_welcome',
        title: '🎉 Bem-vindo ao Premium!',
        message: `Parabéns ${username || 'aí'}! Seus benefícios Premium foram ativados. Agora você pode criar eventos particulares em qualquer lugar!`,
        data: {
          type: 'premium_activation',
          activated_at: new Date().toISOString()
        },
        created_at: new Date().toISOString()
      });

    console.log('✅ Notificação de boas-vindas enviada para:', userId);

  } catch (error) {
    console.error('Erro ao enviar notificação de boas-vindas:', error);
  }
}