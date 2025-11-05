// Script de teste para API og.js
// Uso: node test-og-api.js

import { createClient } from "@supabase/supabase-js";
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config({ path: '.env.production' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('\n🧪 TESTE DA LÓGICA DO OG.JS\n');
console.log('📍 Supabase URL:', supabaseUrl);
console.log('🔑 Supabase Key:', supabaseKey ? 'Configurada ✅' : 'Faltando ❌');

if (!supabaseUrl || !supabaseKey) {
  console.error('\n❌ Variáveis de ambiente não configuradas!\n');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Função helper copiada do og.js
function getPartnerImage(partner, supabaseUrl) {
  if (!partner) {
    console.log('[TEST] getPartnerImage: partner é null/undefined');
    return null;
  }

  console.log('[TEST] getPartnerImage: Analisando partner', {
    id: partner.id,
    name: partner.name,
    hasAvatarUrl: !!partner.avatar_url,
    hasPhotos: !!partner.photos
  });

  // 1. PRIORIDADE: avatar_url (nova estrutura)
  if (partner.avatar_url) {
    const cleanUrl = String(partner.avatar_url).trim();

    if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
      console.log('[TEST] Usando avatar_url completo:', cleanUrl);
      return cleanUrl;
    }

    const fullUrl = `${supabaseUrl}/storage/v1/object/public/partner-avatars/${cleanUrl}`;
    console.log('[TEST] Montando URL do avatar_url:', fullUrl);
    return fullUrl;
  }

  // 2. FALLBACK: photos[0] (estrutura legada)
  const rawPhotos = partner.photos;
  if (rawPhotos) {
    let photoPath = Array.isArray(rawPhotos) ? rawPhotos[0] : rawPhotos;

    if (photoPath) {
      const cleanPath = String(photoPath).trim();

      if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
        console.log('[TEST] Usando photos[0] completo:', cleanPath);
        return cleanPath;
      }

      const fullUrl = `${supabaseUrl}/storage/v1/object/public/photos/${cleanPath}`;
      console.log('[TEST] Montando URL do photos[0]:', fullUrl);
      return fullUrl;
    }
  }

  console.log('[TEST] Nenhuma imagem encontrada no partner');
  return null;
}

// Buscar um evento de exemplo
console.log('\n--- TESTE 1: Buscar eventos com partners ---\n');

const { data: events, error: eventsError } = await supabase
  .from('events')
  .select(`
    id,
    title,
    event_type,
    partner_id,
    partners ( id, name, avatar_url, photos )
  `)
  .not('partner_id', 'is', null)
  .limit(3);

if (eventsError) {
  console.error('❌ Erro ao buscar eventos:', eventsError);
} else {
  console.log(`✅ Encontrados ${events?.length || 0} eventos com partner_id\n`);

  for (const event of events || []) {
    console.log(`\n📋 Evento: ${event.title}`);
    console.log(`   ID: ${event.id}`);
    console.log(`   Tipo: ${event.event_type}`);
    console.log(`   Partner ID: ${event.partner_id}`);
    console.log(`   Partners FK retornou:`, event.partners ? '✅ Sim' : '❌ Null');

    // Se FK falhou, tentar buscar direto
    let partnerData = event.partners;

    if (!partnerData && event.partner_id) {
      console.log(`   🔄 Tentando buscar partner ${event.partner_id} diretamente...`);

      const { data: directPartner, error: partnerError } = await supabase
        .from('partners')
        .select('id, name, avatar_url, photos')
        .eq('id', event.partner_id)
        .single();

      if (partnerError) {
        console.error('   ❌ Erro ao buscar partner:', partnerError.message);
      } else {
        partnerData = directPartner;
        console.log(`   ✅ Partner encontrado: ${partnerData?.name}`);
      }
    }

    if (partnerData) {
      console.log(`   Partner: ${partnerData.name}`);
      const image = getPartnerImage(partnerData, supabaseUrl);
      console.log(`   Imagem final: ${image || 'og-default.jpg'}`);
    } else {
      console.log(`   ⚠️  Sem partner - usaria og-default.jpg`);
    }
  }
}

console.log('\n\n✅ Teste concluído!\n');
