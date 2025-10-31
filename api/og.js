// /api/og.js
/* eslint-env node */

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  // 🔹 Valores padrão
  let title = "Mesapra2 - Social Dining";
  let description = "Conectando pessoas através de experiências gastronômicas únicas.";
  let image = "https://app.mesapra2.com/og-default.jpg";
  let url = "https://app.mesapra2.com/";

  const { event_id } = req.query;

  // 🔹 Validar variáveis de ambiente
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("❌ Variáveis de ambiente não configuradas!");
    return sendMetaTags(res, title, description, image, url);
  }

  // 🔹 Se houver event_id, busca o evento + parceiro
  if (event_id) {
    try {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
        // 🔹 Definir título e descrição
        title = event.title || `Evento #${event.id} - Mesapra2`;
        description =
          event.description ||
          `Participe de uma experiência gastronômica inesquecível${
            event.partner?.name ? ` em ${event.partner.name}` : ""
          }.`;

        // 🔹 LÓGICA DE IMAGEM (prioridade)
        let selectedImage = null;

        // 1️⃣ Primeira foto do evento
        if (event.event_photos && event.event_photos.length > 0) {
          selectedImage = event.event_photos[0];
          console.log("✅ Usando foto do evento:", selectedImage);
        }
        // 2️⃣ Primeira foto do parceiro
        else if (event.partner?.photos && event.partner.photos.length > 0) {
          selectedImage = event.partner.photos[0];
          console.log("✅ Usando foto do parceiro:", selectedImage);
        }
        // 3️⃣ Logo do parceiro
        else if (event.partner?.logo_url) {
          selectedImage = event.partner.logo_url;
          console.log("✅ Usando logo do parceiro:", selectedImage);
        }

        // 🔹 Construir URL completa da imagem
        if (selectedImage) {
          // Se já for URL completa (http/https), usa direto
          if (selectedImage.startsWith("http")) {
            image = selectedImage;
          } else {
            // Senão, constrói URL do Supabase Storage
            image = `${supabaseUrl}/storage/v1/object/public/photos/${selectedImage}`;
          }
        }

        url = `https://app.mesapra2.com/event/${event.id}`;
      }
    } catch (err) {
      console.error("❌ Erro inesperado:", err);
      // Continua com valores padrão
    }
  }

  return sendMetaTags(res, title, description, image, url);
}

// 🔹 Função auxiliar para enviar HTML
function sendMetaTags(res, title, description, image, url) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
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

// 🔹 Função para escapar HTML (segurança)
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}