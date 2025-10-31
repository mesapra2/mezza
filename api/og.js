// /api/og.js
/* eslint-env node */

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  console.log("📋 [OG] Query:", req.query);

  // Valores padrão
  let title = "Mesapra2 - Social Dining";
  let description = "Conectando pessoas através de experiências gastronômicas únicas.";
  let image = "https://app.mesapra2.com/og-default.jpg";
  let url = "https://app.mesapra2.com/";

  const { event_id, partner_id } = req.query;

  // ✅ Variáveis de ambiente (tenta com e sem VITE_)
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("❌ [OG] Variáveis de ambiente não configuradas!");
    return sendMetaTags(res, title, description, image, url);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // ===== ROTA: /event/:id =====
  if (event_id) {
    console.log("📅 [OG] Processando evento:", event_id);
    
    try {
      const { data: event, error } = await supabase
        .from("events")
        .select(`
          id,
          title,
          description,
          partner:partners (
            name,
            photos
          )
        `)
        .eq("id", event_id)
        .single();

      if (error) {
        console.error("⚠️ [OG] Erro ao buscar evento:", error.message);
      } else if (event) {
        title = event.title || `Evento #${event.id} - Mesapra2`;
        description = event.description || `Participe de uma experiência gastronômica inesquecível${event.partner?.name ? ` em ${event.partner.name}` : ""}.`;

        // ✅ CORREÇÃO CRÍTICA: Pegar foto do restaurante (bucket photos)
        if (event.partner?.photos && event.partner.photos.length > 0) {
          const photoUrl = event.partner.photos[0];
          
          // Se já é URL completa
          if (photoUrl.startsWith('http')) {
            image = photoUrl;
          } else {
            // ✅ Construir URL do Supabase Storage (bucket photos)
            image = `${supabaseUrl}/storage/v1/object/public/photos/${photoUrl}`;
          }
          console.log("✅ [OG] Usando foto do restaurante:", image);
        } else {
          console.log("⚠️ [OG] Nenhuma foto do restaurante, usando padrão");
        }

        url = `https://app.mesapra2.com/event/${event.id}`;
      }
    } catch (err) {
      console.error("❌ [OG] Erro ao buscar evento:", err);
    }
  }
  // ===== ROTA: /restaurant/:id =====
  else if (partner_id) {
    console.log("🍽️ [OG] Processando restaurante:", partner_id);
    
    try {
      const { data: partner, error } = await supabase
        .from("partners")
        .select("id, name, description, photos")
        .eq("id", partner_id)
        .single();

      if (error) {
        console.error("⚠️ [OG] Erro ao buscar restaurante:", error.message);
      } else if (partner) {
        title = partner.name || `Restaurante #${partner.id} - Mesapra2`;
        description = partner.description || `Conheça ${partner.name || "este restaurante"} e descubra experiências gastronômicas incríveis.`;

        // ✅ Pegar foto do restaurante
        if (partner.photos && partner.photos.length > 0) {
          const photoUrl = partner.photos[0];
          
          if (photoUrl.startsWith('http')) {
            image = photoUrl;
          } else {
            image = `${supabaseUrl}/storage/v1/object/public/photos/${photoUrl}`;
          }
          console.log("✅ [OG] Usando foto do restaurante:", image);
        }

        url = `https://app.mesapra2.com/restaurant/${partner.id}`;
      }
    } catch (err) {
      console.error("❌ [OG] Erro ao buscar restaurante:", err);
    }
  }

  return sendMetaTags(res, title, description, image, url);
}

// Função para enviar HTML
function sendMetaTags(res, title, description, image, url) {
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
    
    <script>
      window.location.href = "${escapeHtml(url)}";
    </script>
  </head>
  <body>
    <noscript>
      <meta http-equiv="refresh" content="0;url=${escapeHtml(url)}" />
    </noscript>
  </body>
</html>
  `);
}

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