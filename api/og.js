/* eslint-env node */
// api/og.js
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
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
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // ============================
    // EVENTO
    // ============================
    if (type === "event" && id) {
      const { data: event, error } = await supabase
        .from("events")
        .select(`
          id,
          title,
          description,
          partners ( id, name, photos )
        `)
        .eq("id", id)
        .single();

      if (event && !error) {
        title = event.title || title;
        description =
          event.description ||
          `Participe de uma experiência gastronômica incrível em ${event.partners?.name || "restaurantes parceiros"}.`;

        const rawPhotos = event.partners?.photos;
        if (rawPhotos) {
          let photoPath = Array.isArray(rawPhotos) ? rawPhotos[0] : rawPhotos;
          if (photoPath && !photoPath.startsWith("http")) {
            photoPath = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/${photoPath}`;
          }
          image = photoPath;
        }

        url = `https://app.mesapra2.com/event/${event.id}`;
      }
    }

    // ============================
    // RESTAURANTE
    // ============================
    if (type === "restaurant" && id) {
      const { data: partner, error } = await supabase
        .from("partners")
        .select("id, name, description, photos")
        .eq("id", id)
        .single();

      if (partner && !error) {
        title = partner.name || title;
        description =
          partner.description ||
          `Conheça ${partner.name || "este restaurante"} e viva experiências gastronômicas únicas.`;

        const rawPhotos = partner.photos;
        if (rawPhotos) {
          let photoPath = Array.isArray(rawPhotos) ? rawPhotos[0] : rawPhotos;
          if (photoPath && !photoPath.startsWith("http")) {
            photoPath = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/${photoPath}`;
          }
          image = photoPath;
        }

        url = `https://app.mesapra2.com/restaurant/${partner.id}`;
      }
    }
  } catch (error) {
    console.error('Erro ao buscar dados:', error);
  }

  // HTML com meta tags
  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    
    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
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