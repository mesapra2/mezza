// /api/og.js
/* eslint-env node */

import { createClient } from "@supabase/supabase-js";

// 🔹 Conexão com o Supabase (variáveis de ambiente definidas na Vercel)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async function handler(req, res) {
  const { event_id } = req.query;

  // Valores padrão (para quando não há event_id)
  let title = "Mesapra2 - Social Dining";
  let description = "Conectando pessoas através de experiências gastronômicas únicas.";
  let image = "https://app.mesapra2.com/og-default.jpg";
  let url = "https://app.mesapra2.com/";

  // 🔸 Se houver event_id, busca o evento no Supabase
  if (event_id) {
    try {
      const { data: event, error } = await supabase
        .from("events")
        .select("id, title, description, cover_image, partner:partners(name)")
        .eq("id", event_id)
        .single();

      if (!error && event) {
        title = event.title || `Evento #${event.id} - Mesapra2`;
        description =
          event.description ||
          `Participe de uma experiência gastronômica inesquecível em ${
            event.partner?.name || "um local especial"
          }.`;

        // 🔹 Usa a imagem do evento se existir
        if (event.cover_image) {
          image = event.cover_image.startsWith("http")
            ? event.cover_image
            : `${supabaseUrl}/storage/v1/object/public/event_covers/${event.cover_image}`;
        }

        url = `https://app.mesapra2.com/event/${event.id}`;
      }
    } catch (err) {
      console.error("Erro ao buscar evento:", err);
    }
  }

  // 🔸 Gera HTML com metatags OG + redirecionamento
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(`
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <meta name="description" content="${description}" />

    <meta property="og:type" content="website" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:image:secure_url" content="${image}" />
    <meta property="og:image:type" content="image/jpeg" />
    <meta property="og:url" content="${url}" />
    <meta property="og:site_name" content="Mesapra2" />
    <meta property="og:locale" content="pt_BR" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${image}" />
  </head>
  <body>
    <script>
      window.location.href = "${url}";
    </script>
  </body>
</html>
  `);
}
