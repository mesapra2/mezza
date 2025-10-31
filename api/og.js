// /api/og.js
/* eslint-env node */

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  // 1) pega da query primeiro (porque a Vercel está reescrevendo assim)
  const { event_id: qEventId, partner_id: qPartnerId } = req.query || {};

  // valores padrão
  let title = "Mesapra2 - Social Dining";
  let description =
    "Conectando pessoas através de experiências gastronômicas únicas.";
  let image = "https://app.mesapra2.com/og-default.jpg";
  let url = "https://app.mesapra2.com/";

  // 2) mantém detecção por pathname SÓ COMO BACKUP
  const pathname = req.url || "";
  let event_id = qEventId || null;
  let partner_id = qPartnerId || null;

  if (!event_id && !partner_id) {
    const eventMatch = pathname.match(/\/event\/([^/?]+)/);
    const partnerMatch = pathname.match(/\/restaurant\/([^/?]+)/);
    if (eventMatch) event_id = eventMatch[1];
    if (partnerMatch) partner_id = partnerMatch[1];
  }

  // 3) envs ok (você disse que já estão OK)
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseAnonKey =
    process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("❌ [OG] Variáveis de ambiente não configuradas!");
    return sendMetaTags(res, title, description, image, url);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // =========================================================
  // CENÁRIO 1: /event/:id  -> sempre pegar a foto do restaurante do evento
  // =========================================================
  if (event_id) {
    try {
      // você já tinha isso: events -> partner:partners(...)
      const { data: event, error } = await supabase
        .from("events")
        .select(
          `
          id,
          title,
          description,
          partner:partners (
            id,
            name,
            photos
          )
        `
        )
        .eq("id", event_id)
        .single();

      if (!error && event) {
        // título
        title = event.title
          ? event.title
          : `Evento #${event.id} - Mesapra2`;

        // descrição
        description =
          event.description ||
          `Participe de uma experiência gastronômica incrível${
            event.partner?.name ? ` em ${event.partner.name}` : ""
          }.`;

        // foto do restaurante (bucket)
        if (event.partner?.photos && event.partner.photos.length > 0) {
          const photoUrl = event.partner.photos[0];

          if (photoUrl.startsWith("http")) {
            image = photoUrl;
          } else {
            // monta do bucket, que foi o que você pediu
            image = `${supabaseUrl}/storage/v1/object/public/photos/${photoUrl}`;
          }
        }

        // url final do evento
        url = `https://app.mesapra2.com/event/${event.id}`;
      } else {
        console.warn("⚠️ [OG] Evento não encontrado:", error?.message);
      }
    } catch (err) {
      console.error("❌ [OG] Erro ao buscar evento:", err);
    }
  }

  // =========================================================
  // CENÁRIO 2: /restaurant/:id  -> mesma lógica
  // =========================================================
  else if (partner_id) {
    try {
      const { data: partner, error } = await supabase
        .from("partners")
        .select("id, name, description, photos")
        .eq("id", partner_id)
        .single();

      if (!error && partner) {
        title = partner.name || `Restaurante #${partner.id} - Mesapra2`;
        description =
          partner.description ||
          `Conheça ${partner.name || "este restaurante"} e descubra experiências gastronômicas incríveis.`;

        if (partner.photos && partner.photos.length > 0) {
          const photoUrl = partner.photos[0];
          if (photoUrl.startsWith("http")) {
            image = photoUrl;
          } else {
            image = `${supabaseUrl}/storage/v1/object/public/photos/${photoUrl}`;
          }
        }

        url = `https://app.mesapra2.com/restaurant/${partner.id}`;
      } else {
        console.warn("⚠️ [OG] Restaurante não encontrado:", error?.message);
      }
    } catch (err) {
      console.error("❌ [OG] Erro ao buscar restaurante:", err);
    }
  }

  // 4) devolve SÓ o HTML com meta (SEM redirect)
  return sendMetaTags(res, title, description, image, url);
}

// ------------------------------------------------------------------
// HTML final pros crawlers
// ------------------------------------------------------------------
function sendMetaTags(res, title, description, image, url) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader(
    "Cache-Control",
    "public, max-age=300, s-maxage=600, stale-while-revalidate=86400"
  );

  res.status(200).send(`<!doctype html>
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
  </head>
  <body>
    <p>Preview OG de ${escapeHtml(title)}</p>
  </body>
</html>`);
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
