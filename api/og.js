// /api/og.js
/* eslint-env node */

import { createClient } from "@supabase/supabase-js";

// se você quiser rodar como Edge Function no Vercel, pode deixar isso ativo:
// export const config = { runtime: "edge" };

export default async function handler(req, res) {
  // 1. descobrir host real (produção, preview, etc.)
  const host = req.headers["x-forwarded-host"] || req.headers.host || "app.mesapra2.com";
  const proto = req.headers["x-forwarded-proto"] || "https";
  const baseUrl = `${proto}://${host}`;

  // 2. defaults
  let title = "Mesapra2 - Social Dining";
  let description = "Conectando pessoas através de experiências gastronômicas únicas.";
  let image = `${baseUrl}/og-default.jpg`;
  let url = `${baseUrl}/`;

  // 3. pegar query vindos do rewrite
  // hoje o seu vercel chama assim: /api/og.js?type=event&id=32
  const q = req.query || {};
  let type = q.type || null;
  let id = q.id || null;

  // 4. fallback: detectar pelo path (ex.: /event/32, /restaurant/8)
  const pathname = (req.url || "").split("?")[0] || "";
  if (!type || !id) {
    const eventMatch = pathname.match(/\/event\/([^/?]+)/);
    const restMatch = pathname.match(/\/restaurant\/([^/?]+)/);
    if (eventMatch) {
      type = "event";
      id = eventMatch[1];
    } else if (restMatch) {
      type = "restaurant";
      id = restMatch[1];
    }
  }

  // 5. pegar as envs do Supabase (aceitando os dois jeitos)
  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("❌ [OG] Variáveis de ambiente do Supabase não configuradas.");
    return sendMetaTags(res, title, description, image, url);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // helper pra montar link do storage
  const buildStorageUrl = (raw) => {
    if (!raw) return null;
    if (raw.startsWith("http://") || raw.startsWith("https://")) {
      return raw;
    }
    // se vier event-photos/...
    if (raw.startsWith("event-photos/")) {
      return `${supabaseUrl}/storage/v1/object/public/event-photos/${raw.replace(
        /^event-photos\//,
        ""
      )}`;
    }
    // padrão: bucket photos
    return `${supabaseUrl}/storage/v1/object/public/photos/${raw.replace(/^photos\//, "")}`;
  };

  // ======================================================
  // 6. EVENTO
  // ======================================================
  if (type === "event" && id) {
    try {
      const { data: event, error } = await supabase
        .from("events")
        .select(
          `
          id,
          title,
          description,
          photo,
          photos,
          banner,
          partner:partners (
            id,
            name,
            photos
          )
        `
        )
        .eq("id", id)
        .single();

      if (error) {
        console.error("⚠️ [OG] Erro ao buscar evento:", error.message);
      } else if (event) {
        title = event.title || `Evento #${event.id} - Mesapra2`;
        description =
          event.description ||
          `Participe de uma experiência gastronômica inesquecível${
            event.partner?.name ? ` em ${event.partner.name}` : ""
          }.`;

        // prioridade de imagem:
        // 1) event.photo
        // 2) event.banner
        // 3) primeira de event.photos[]
        // 4) primeira de partner.photos[]
        let candidate =
          event.photo ||
          event.banner ||
          (Array.isArray(event.photos) && event.photos.length > 0 ? event.photos[0] : null);

        if (!candidate && event.partner?.photos && event.partner.photos.length > 0) {
          candidate = event.partner.photos[0];
        }

        if (candidate) {
          image = buildStorageUrl(candidate);
        }

        url = `${baseUrl}/event/${event.id}`;
      }
    } catch (err) {
      console.error("❌ [OG] Erro inesperado ao montar OG de evento:", err);
    }

    return sendMetaTags(res, title, description, image, url);
  }

  // ======================================================
  // 7. RESTAURANTE / PARTNER
  // ======================================================
  if (type === "restaurant" && id) {
    try {
      const { data: partner, error } = await supabase
        .from("partners")
        .select("id, name, description, photos")
        .eq("id", id)
        .single();

      if (error) {
        console.error("⚠️ [OG] Erro ao buscar restaurante:", error.message);
      } else if (partner) {
        title = partner.name || `Restaurante #${partner.id} - Mesapra2`;
        description =
          partner.description ||
          `Conheça ${partner.name || "este restaurante"} e descubra experiências gastronômicas incríveis.`;

        if (partner.photos && partner.photos.length > 0) {
          image = buildStorageUrl(partner.photos[0]);
        }

        url = `${baseUrl}/restaurant/${partner.id}`;
      }
    } catch (err) {
      console.error("❌ [OG] Erro inesperado ao montar OG de restaurante:", err);
    }

    return sendMetaTags(res, title, description, image, url);
  }

  // ======================================================
  // 8. fallback → homepage
  // ======================================================
  return sendMetaTags(res, title, description, image, url);
}

// ----------------------------------------------------
// monta o HTML com og: e redireciona pro React
// ----------------------------------------------------
function sendMetaTags(res, title, description, image, url) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader(
    "Cache-Control",
    "public, max-age=300, s-maxage=600, stale-while-revalidate=86400"
  );

  const html = `
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
    <meta property="og:url" content="${escapeHtml(url)}" />
    <meta property="og:site_name" content="Mesapra2" />
    <meta property="og:locale" content="pt_BR" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(image)}" />

    <!-- redireciona pro app React -->
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
  `.trim();

  res.status(200).send(html);
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
