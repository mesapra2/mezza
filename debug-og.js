// Script de debug para testar a API de OG images
// Uso: node debug-og.js EVENT_ID

import { createClient } from "@supabase/supabase-js";
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config({ path: '.env.production' });

const eventId = process.argv[2];

if (!eventId) {
  console.error('❌ Uso: node debug-og.js EVENT_ID');
  process.exit(1);
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não configuradas!');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? '✅' : '❌');
  process.exit(1);
}

console.log('\n🔍 Testando busca de evento:', eventId);
console.log('📍 URL Supabase:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

// Testar query do OG
console.log('\n--- Teste 1: Query original do og.js ---');
const { data: event1, error: error1 } = await supabase
  .from("events")
  .select(`
    id,
    title,
    description,
    event_type,
    partner_id,
    partners ( id, name, avatar_url, photos )
  `)
  .eq("id", eventId)
  .single();

console.log('Resultado:', JSON.stringify(event1, null, 2));
console.log('Erro:', error1);

// Testar busca do partner separadamente
if (event1?.partner_id) {
  console.log('\n--- Teste 2: Buscar partner direto ---');
  const { data: partner, error: error2 } = await supabase
    .from("partners")
    .select("id, name, avatar_url, photos")
    .eq("id", event1.partner_id)
    .single();

  console.log('Partner encontrado:', JSON.stringify(partner, null, 2));
  console.log('Erro:', error2);

  // Testar URL da imagem
  if (partner) {
    console.log('\n--- Teste 3: URLs das imagens ---');

    if (partner.avatar_url) {
      const isFullUrl = partner.avatar_url.startsWith('http');
      console.log('avatar_url:', partner.avatar_url);
      console.log('É URL completa?', isFullUrl);

      if (!isFullUrl) {
        const fullUrl = `${supabaseUrl}/storage/v1/object/public/partner-avatars/${partner.avatar_url}`;
        console.log('URL completa:', fullUrl);
      }
    }

    if (partner.photos) {
      const photoPath = Array.isArray(partner.photos) ? partner.photos[0] : partner.photos;
      console.log('photos[0]:', photoPath);

      if (photoPath && !photoPath.startsWith('http')) {
        const fullUrl = `${supabaseUrl}/storage/v1/object/public/photos/${photoPath}`;
        console.log('URL completa:', fullUrl);
      }
    }

    if (!partner.avatar_url && !partner.photos) {
      console.log('⚠️  Partner sem imagens! Vai usar og-default.jpg');
    }
  }
} else {
  console.log('\n⚠️  Evento sem partner_id! Vai usar og-default.jpg');
}

console.log('\n✅ Debug concluído!\n');
