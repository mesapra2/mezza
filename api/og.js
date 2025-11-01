// /api/og.js
/* eslint-env node */

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  // descobrir domínio atual (vercel preview, prod, etc.)
  const host = req.headers["x-forwarded-host"] || req.headers.host || "app.mesapra2.com";
  const proto = req.headers["x-forwarded-proto"] || "https";
  const baseUrl = `${proto}://${host}`;

  // defaults
  let title = "Mesapra2 - Social Dining";
  let description = "Conectando pessoas através de experiências gastronômicas únicas.";
  let image = `${baseUrl}/og-default.jpg`;
  let url = `${baseUrl}/`;

  // query do rewrite: /api/og.js?type=event&id=32
  const q = req.query || {};
  let type = q.type || null;
  let id = q.id || null;

  // fallback: detectar pelo path (/event/32, /restaurant/9)
  const pathname = (req.url || "").split("?")[0] || "";
  if (!type || !id) {
    const mEvent = pathname.match(/\/event\/([^/?]+)/);
    const mRest = pathname.match(/\/restaurant\/([^/?]+)/);
    if (mEvent) {
      type = "event";
      id = mEvent[1];
    } else if (mRest) {
      type = "restaurant";
      id = mRest[1];
    }
  }

  // envs do supabase
  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("❌ [OG] SUPABASE_URL / SUPABASE_ANON_KEY não configurados.");
    return sendMetaTags(res, title, description, image, url);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // helper pra montar link do storage
  const buildStorageUrl = (raw) => {
    if (!raw) return null;
    if (raw.startsWith("http://") || raw.startsWith("https://")) {
      return raw;
    }
    if (raw.startsWith("event-photos/")) {
      return `${supabaseUrl}/storage/v1/object/public/event-photos/${raw.replace(
        /^event-photos\//,
        ""
      )}`;
    }
    // default: bucket "photos"
    return `${supabaseUrl}/storage/v1/object/public/photos/${raw.replace(/^photos\//, "")}`;
  };

  // helper: detectar se a foto veio do bucket "photos" (provavelmente upload de usuário)
  const isSupabasePhoto = (urlStr) => {
    if (!urlStr) return false;
    return (
      urlStr.startsWith(`${supabaseUrl}/storage/v1/object/public/photos/`) ||
      urlStr.startsWith("photos/") ||
      urlStr.includes("/storage/v1/object/public/photos/")
    );
  };

  // ==========================================================
  // EVENTO
  // ==========================================================
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
        console.error("⚠️ [OG] erro ao buscar evento:", error.message);
      } else if (event) {
        title = event.title || `Evento #${event.id} - Mesapra2`;
        description =
          event.description ||
          `Participe de uma experiência gastronômica${
            event.partner?.name ? ` em ${event.partner.name}` : ""
          }.`;

        // 1) o que veio do evento
        let eventCandidate =
          event.photo ||
          event.banner ||
          (Array.isArray(event.photos) && event.photos.length > 0 ? event.photos[0] : null);

        // 2) o que veio do parceiro (restaurante) — ex: Skys, Belini, etc.
        let partnerCandidate =
          event.partner?.photos && event.partner.photos.length > 0
            ? event.partner.photos[0]
            : null;

        // regra que resolve o seu caso:
        // - se a foto do evento for de "photos/" (upload de user)
        // - e o parceiro tiver foto
        // -> usa a foto do parceiro
        let finalImage = null;
        if (eventCandidate && isSupabasePhoto(eventCandidate) && partnerCandidate) {
          finalImage = buildStorageUrl(partnerCandidate);
        } else if (eventCandidate) {
          finalImage = buildStorageUrl(eventCandidate);
        } else if (partnerCandidate) {
          finalImage = buildStorageUrl(partnerCandidate);
        }

        if (finalImage) {
          image = finalImage;
        }

        url = `${baseUrl}/event/${event.id}`;
      }
    } catch (err) {
      console.error("❌ [OG] erro inesperado ao montar evento:", err);
    }

    return sendMetaTags(res, title, description, image, url);
  }

  // ==========================================================
  // RESTAURANTE
  // ==========================================================
  if (type === "restaurant" && id) {
    try {
      const { data: partner, error } = await supabase
        .from("partners")
        .select("id, name, description, photos")
        .eq("id", id)
        .single();

      if (error) {
        console.error("⚠️ [OG] erro ao buscar restaurante:", error.message);
      } else if (partner) {
        title = partner.name || `Restaurante #${partner.id} - Mesapra2`;
        description =
          partner.description ||
          `Conheça ${partner.name || "este restaurante"} e descubra experiências gastronômicas.`;

        if (partner.photos && partner.photos.length > 0) {
          image = buildStorageUrl(partner.photos[0]);
        }

        url = `${baseUrl}/restaurant/${partner.id}`;
      }
    } catch (err) {
      console.error("❌ [OG] erro inesperado ao montar restaurante:", err);
    }

    return sendMetaTags(res, title, description, image, url);
  }

  // fallback
  return sendMetaTags(res, title, description, image, url);
}

function sendMetaTags(res, title, description, image, url) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader(
    "Cache-Control",
    "public, max-age=300, s-maxage=600, stale-while-revalidate=86400"
  );

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
    <meta property="og:url" content="${escapeHtml(url)}" />
    <meta property="og:site_name" content="Mesapra2" />
    <meta property="og:locale" content="pt_BR" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(image)}" />

    <script>window.location.href = "${escapeHtml(url)}";</script>
  </head>
  <body>
    <noscript><meta http-equiv="refresh" content="0;url=${escapeHtml(url)}" /></noscript>
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
    "'": "&#039;"
  };
  return String(text).replace(/[&<>"']/g, (m) => map[m]);
}
