// /api/og.js
/* eslint-env node */

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  console.log("📋 Query params:", req.query);

  // Valores padrão
  let title = "Mesapra2 - Social Dining";
  let description = "Conectando pessoas através de experiências gastronômicas únicas.";
  let image = "https://app.mesapra2.com/og-default.jpg";
  let url = "https://app.mesapra2.com/";

  const { event_id, partner_id } = req.query;

  // Validar variáveis de ambiente (CORRIGIDO PARA VITE_)
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("❌ Variáveis de ambiente não configuradas!");
    return sendMetaTags(res, title, description, image, url);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // ===== ROTA: /event/:id =====
  if (event_id) {
    console.log("📅 Processando evento:", event_id);
    
    try {
      const { data: event, error } = await supabase
        .from("events")
        .select(`
          id,
          title,
          description,
          event_photos,
          partner_id,
          partner:partners (
            name,
            logo_url,
            photos
          )
        `)
        .eq("id", event_id)
        .single();

      if (error) {
        console.error("⚠️ Erro ao buscar evento:", error.message);
      } else if (event) {
        title = event.title || `Evento #${event.id} - Mesapra2`;
        description =
          event.description ||
          `Participe de uma experiência gastronômica inesquecível${
            event.partner?.name ? ` em ${event.partner.name}` : ""
          }.`;

        // ✅ LÓGICA DE SELEÇÃO DE IMAGEM INVOCADA
        image = selectImage(
          event.partner?.photos, // P1: Foto do restaurante
          event.event_photos,    // P2: Foto do evento
          event.partner?.logo_url, // P3: Logo do restaurante
          supabaseUrl
        );

        url = `https://app.mesapra2.com/event/${event.id}`;
        console.log("✅ Evento processado. Imagem:", image);
      }
    } catch (err) {
      console.error("❌ Erro ao buscar evento:", err);
    }
  }
  // ===== ROTA: /restaurant/:id =====
  else if (partner_id) {
    console.log("🍽️ Processando restaurante:", partner_id);
    
    try {
      const { data: partner, error } = await supabase
        .from("partners")
        .select("id, name, description, logo_url, photos")
        .eq("id", partner_id)
        .single();

      if (error) {
        console.error("⚠️ Erro ao buscar restaurante:", error.message);
      } else if (partner) {
        title = partner.name || `Restaurante #${partner.id} - Mesapra2`;
        description =
          partner.description ||
          `Conheça ${partner.name || "este restaurante"} e descubra experiências gastronômicas incríveis.`;

        // ✅ LÓGICA DE SELEÇÃO DE IMAGEM INVOCADA (Aqui a ordem está correta)
        image = selectImage(
          partner.photos, 
          null, // Sem foto de evento
          partner.logo_url, 
          supabaseUrl
        );

        url = `https://app.mesapra2.com/restaurant/${partner.id}`;
        console.log("✅ Restaurante processado. Imagem:", image);
      }
    } catch (err) {
      console.error("❌ Erro ao buscar restaurante:", err);
    }
  }

  return sendMetaTags(res, title, description, image, url);
}

// =================================================================
// 🚀 FUNÇÃO 'selectImage' ATUALIZADA
// =================================================================
function selectImage(partnerPhotos, eventPhotos, logoUrl, supabaseUrl) {
  let selected = null;

  // ✅ PRIORIDADE 1: Foto do restaurante (partnerPhotos)
  if (partnerPhotos && partnerPhotos.length > 0) {
    selected = partnerPhotos[0];
    console.log("  → Usando foto do parceiro (Prioridade 1)");
  
  // ✅ PRIORIDADE 2: Foto do evento (eventPhotos)
  } else if (eventPhotos && eventPhotos.length > 0) {
    selected = eventPhotos[0];
    console.log("  → Usando foto do evento (Prioridade 2)");

  // ✅ PRIORIDADE 3: Logo do restaurante (logoUrl)
  } else if (logoUrl) {
    selected = logoUrl;
    console.log("  → Usando logo do parceiro (Prioridade 3)");
  }

  if (selected) {
    // Se a URL já for completa, retorna ela
    if (selected.startsWith("http")) {
      // Adiciona cache bust apenas para og-default.jpg
      if (selected.includes("og-default.jpg")) {
        return `${selected}?v=${Date.now()}`;
      }
      return selected;
    }
    // Constrói a URL do Supabase Storage (conforme seu exemplo)
    return `${supabaseUrl}/storage/v1/object/public/photos/${selected}`;
  }

  console.log("  → Usando og-default.jpg (Fallback)");
  // Cache bust para forçar atualização da imagem padrão
  return `https://app.mesapra2.com/og-default.jpg?v=${Date.now()}`;
}

// Função para enviar HTML
function sendMetaTags(res, title, description, image, url) {
  // Headers importantes para o Facebook
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=300, s-maxage=600, stale-while-revalidate=86400");
  
  res.status(200).send(`
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />

    <meta property="og:type" content="website" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${escapeHtml(image)}" />
    <meta property="og:image:secure_url" content="${escapeHtml(image)}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:type" content="image/jpeg" />
    <meta property="og:url" content="${escapeHtml(url)}" />
    <meta property="og:site_name" content="Mesapra2" />
    <meta property="og:locale" content="pt_BR" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(image)}" />
  </head>
  <body>
    <script>
      window.location.href = "${escapeHtml(url)}";
    </script>
    <noscript>
      <meta http-equiv="refresh" content="0;url=${escapeHtml(url)}" />
    </noscript>
  </body>
</html>
  `);
}

// Função para escapar HTML
function escapeHtml(text) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return String(text).replace(/[&<>"']/g, (m) => map[m]);
}