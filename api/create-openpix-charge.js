// api/create-openpix-charge.js
import { supabase } from '../src/lib/supabaseClient.js';

export default async function handler(req, res) {
  // Apenas métodos POST são permitidos
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

  try {
    const { correlationID, value, comment, customer, additionalInfo } = req.body;

    // Validação dos dados obrigatórios
    if (!correlationID || !value || !customer?.email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Dados obrigatórios ausentes' 
      });
    }

    // Configuração da cobrança OpenPix
    const chargeData = {
      correlationID,
      value,
      comment: comment || 'Assinatura Premium - Mesa Pra 2',
      customer: {
        name: customer.name || customer.email,
        email: customer.email,
        phone: customer.phone || undefined,
        taxID: customer.taxID || undefined
      },
      additionalInfo: additionalInfo || []
    };

    // Fazer requisição para OpenPix
    const openPixResponse = await fetch('https://api.openpix.com.br/api/v1/charge', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': process.env.OPENPIX_API_KEY || process.env.VITE_OPENPIX_API_KEY
      },
      body: JSON.stringify(chargeData)
    });

    const openPixResult = await openPixResponse.json();

    if (!openPixResponse.ok) {
      console.error('Erro OpenPix:', openPixResult);
      return res.status(openPixResponse.status).json({
        success: false,
        error: 'Erro ao criar cobrança no OpenPix',
        details: openPixResult
      });
    }

    // Salvar informações da cobrança no banco
    const { data: chargeRecord, error: dbError } = await supabase
      .from('premium_charges')
      .insert({
        correlation_id: correlationID,
        user_id: additionalInfo.find(info => info.key === 'Usuário')?.value,
        plan_type: additionalInfo.find(info => info.key === 'Plano')?.value,
        amount: value,
        charge_id: openPixResult.charge?.id,
        status: 'pending',
        openpix_data: openPixResult,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (dbError) {
      console.error('Erro ao salvar no banco:', dbError);
      // Não retorna erro para não bloquear o pagamento
    }

    // Retornar dados da cobrança
    return res.status(200).json({
      success: true,
      charge: openPixResult.charge,
      message: 'Cobrança criada com sucesso'
    });

  } catch (error) {
    console.error('Erro interno:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
}