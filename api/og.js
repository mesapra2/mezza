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

  // 🔹 Se houver event_id, busca o evento
  if (event_id) {
    try {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);

      const { data: event, error } = await supabase
        .from("events")
        .select("id, title, description, cover_image")
        .eq("id", event_id)
        .single();

      if (error) {
        console.error("⚠️ Erro ao buscar evento:", error.message);
        // Continua com valores padrão
      } else if (event) {
        title = event.title || `Evento #${event.id} - Mesapra2`;
        description =
          event.description ||
          "Participe de uma experiência gastronômica inesquecível.";

        // 🔹 Usar imagem do evento se existir
        if (event.cover_image) {
          image = event.cover_image.startsWith("http")
            ? event.cover_image
            : `${supabaseUrl}/storage/v1/object/public/event_covers/${event.cover_image}`;
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