/* eslint-env node */
// api/og.js
import { createClient } from "@supabase/supabase-js";

// ============================================
// FUNÇÃO HELPER: Pegar imagem do Partner
// ============================================
function getPartnerImage(partner, supabaseUrl) {
  if (!partner) {
    console.log('[OG] getPartnerImage: partner é null/undefined');
    return null;
  }

  console.log('[OG] getPartnerImage: Analisando partner', {
    id: partner.id,
    name: partner.name,
    hasAvatarUrl: !!partner.avatar_url,
    hasPhotos: !!partner.photos,
    avatarUrl: partner.avatar_url,
    photos: partner.photos
  });

  // 1. PRIORIDADE: avatar_url (nova estrutura)
  if (partner.avatar_url) {
    const cleanUrl = String(partner.avatar_url).trim();

    // Se já é URL completa, usa direto
    if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
      console.log('[OG] Usando avatar_url completo:', cleanUrl);
      return cleanUrl;
    }

    // Se é path do storage, monta URL completa
    const fullUrl = `${supabaseUrl}/storage/v1/object/public/partner-avatars/${cleanUrl}`;
    console.log('[OG] Montando URL do avatar_url:', fullUrl);
    return fullUrl;
  }

  // 2. FALLBACK: photos[0] (estrutura legada)
  const rawPhotos = partner.photos;
  if (rawPhotos) {
    let photoPath = Array.isArray(rawPhotos) ? rawPhotos[0] : rawPhotos;

    if (photoPath) {
      const cleanPath = String(photoPath).trim();

      // Se já é URL completa, usa direto
      if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
        console.log('[OG] Usando photos[0] completo:', cleanPath);
        return cleanPath;
      }

      // Se é path do storage, monta URL completa
      const fullUrl = `${supabaseUrl}/storage/v1/object/public/photos/${cleanPath}`;
      console.log('[OG] Montando URL do photos[0]:', fullUrl);
      return fullUrl;
    }
  }

  console.log('[OG] Nenhuma imagem encontrada no partner');
  return null;
}

export default async function handler(req, res) {
  // Log da requisição recebida
  console.log('[OG] === Nova requisição ===');
  console.log('[OG] Method:', req.method);
  console.log('[OG] Query:', req.query);
  console.log('[OG] User-Agent:', req.headers['user-agent']);

  // Permitir CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { type, id } = req.query;

  let title = "Mesapra2 – Jantares sociais que conectam pessoas";
  let description = "Conheça pessoas incríveis em jantares sociais com o aplicativo Mesapra2.";
  let image = "https://app.mesapra2.com/og-default.jpg";
  let url = "https://app.mesapra2.com/";

  try {
    // Suportar ambos os prefixos (VITE_ para dev e NEXT_PUBLIC_ para compatibilidade)
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.VITE_SUPABASE_URL ||
      'https://ksmnfhenhppasfcikefd.supabase.co';

    const supabaseKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzbW5maGVuaHBwYXNmY2lrZWZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyNDg1NjcsImV4cCI6MjA3NTgyNDU2N30.RxONSYX5O7Z0pJTDvSTx6G0IFf0eV9R_6x4_EnXm0II';

    console.log('[OG] Supabase URL:', supabaseUrl);
    console.log('[OG] Supabase Key:', supabaseKey ? 'Configurada ✅' : 'Faltando ❌');

    const supabase = createClient(supabaseUrl, supabaseKey);

    // ============================
    // EVENTO
    // ============================
    if (type === "event" && id) {
      console.log(`[OG] Buscando evento ID: ${id}`);

      // ESTRATÉGIA 1: Tentar com foreign key
      const { data: event, error } = await supabase
        .from("events")
        .select(`
          id,
          title,
          description,
          event_type,
          partner_id,
          partners ( id, name, avatar_url, photos )
        `)
        .eq("id", id)
        .single();

      if (error) {
        console.error(`[OG] Erro ao buscar evento:`, error);
      }

      if (event) {
        console.log(`[OG] Evento encontrado: ${event.title}`);
        console.log(`[OG] Tipo: ${event.event_type}, Partner ID: ${event.partner_id}`);

        title = event.title || title;
        description =
          event.description ||
          `Participe de uma experiência gastronômica incrível em ${event.partners?.name || "restaurantes parceiros"}.`;

        // ESTRATÉGIA 2: Se partner_id existe mas partners é null, buscar direto
        let partnerData = event.partners;

        if (!partnerData && event.partner_id) {
          console.log(`[OG] Foreign key falhou, buscando partner ${event.partner_id} diretamente`);

          const { data: directPartner, error: partnerError } = await supabase
            .from("partners")
            .select("id, name, avatar_url, photos")
            .eq("id", event.partner_id)
            .single();

          if (partnerError) {
            console.error(`[OG] Erro ao buscar partner:`, partnerError);
          } else {
            partnerData = directPartner;
            console.log(`[OG] Partner encontrado: ${partnerData?.name}`);
          }
        }

        // Atualizar descrição com nome do partner se disponível
        if (partnerData?.name && description.includes("restaurantes parceiros")) {
          description = event.description || `Participe de uma experiência gastronômica incrível em ${partnerData.name}.`;
        }

        // ✅ Usar função helper para pegar imagem do partner
        const partnerImage = getPartnerImage(partnerData, supabaseUrl);
        if (partnerImage) {
          console.log(`[OG] Usando imagem do partner: ${partnerImage}`);
          image = partnerImage;
        } else {
          console.log(`[OG] Nenhuma imagem do partner, usando default`);
        }

        url = `https://app.mesapra2.com/event/${event.id}`;
      } else {
        console.log(`[OG] Evento não encontrado`);
      }
    }

    // ============================
    // RESTAURANTE
    // ============================
    if (type === "restaurant" && id) {
      console.log(`[OG] Buscando restaurante ID: ${id}`);

      const { data: partner, error } = await supabase
        .from("partners")
        .select("id, name, description, avatar_url, photos")
        .eq("id", id)
        .single();

      if (error) {
        console.error(`[OG] Erro ao buscar restaurante:`, error);
      }

      if (partner) {
        console.log(`[OG] Restaurante encontrado: ${partner.name}`);

        title = partner.name || title;
        description =
          partner.description ||
          `Conheça ${partner.name || "este restaurante"} e viva experiências gastronômicas únicas.`;

        // ✅ Usar função helper para pegar imagem do partner
        const partnerImage = getPartnerImage(partner, supabaseUrl);
        if (partnerImage) {
          console.log(`[OG] Usando imagem do restaurante: ${partnerImage}`);
          image = partnerImage;
        } else {
          console.log(`[OG] Nenhuma imagem do restaurante, usando default`);
        }

        url = `https://app.mesapra2.com/restaurant/${partner.id}`;
      } else {
        console.log(`[OG] Restaurante não encontrado`);
      }
    }
  } catch (error) {
    console.error('[OG] Erro ao buscar dados:', error);
  }

  // Log do resultado final
  console.log('[OG] === Resultado final ===');
  console.log('[OG] Title:', title);
  console.log('[OG] Description:', description.substring(0, 100) + '...');
  console.log('[OG] Image:', image);
  console.log('[OG] URL:', url);

  // HTML com meta tags
  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    
    <!-- Open Graph / Facebook / WhatsApp -->
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Mesapra2" />
    <meta property="og:locale" content="pt_BR" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:image:secure_url" content="${image}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:type" content="image/jpeg" />
    
    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@mesapra2" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${image}" />
    
    <!-- Redirect para a aplicação -->
    <meta http-equiv="refresh" content="0;url=${url}" />
    <script>
      window.location.href = "${url}";
    </script>
  </head>
  <body>
    <h1>${title}</h1>
    <p>${description}</p>
    <img src="${image}" alt="${title}" style="max-width:100%;height:auto" />
    <p>Se você não foi redirecionado, <a href="${url}">clique aqui</a>.</p>
  </body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
  res.status(200).send(html);
}