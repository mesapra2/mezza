/* eslint-env node */
import { createClient } from "@supabase/supabase-js";

export const config = { runtime: "edge" };

export default async function handler(req) {
  const urlObj = new URL(req.url);
  const searchParams = urlObj.searchParams;
  let type = searchParams.get("type");
  let id = searchParams.get("id");

  // domínio que chamou
  const host = req.headers.get("x-forwarded-host") || urlObj.host || "app.mesapra2.com";
  const proto = req.headers.get("x-forwarded-proto") || urlObj.protocol.replace(":", "") || "https";
  const baseUrl = `${proto}://${host}`;

  // defaults
  let title = "Mesapra2 — Jantares sociais que conectam pessoas";
  let description = "Conheça pessoas incríveis em jantares sociais com o aplicativo Mesapra2.";
  let image = `${baseUrl}/og-default.jpg`;
  let pageUrl = `${baseUrl}/`;

  // se chamarem direto /event/32 sem query (algum bot pode fazer isso)
  if (!type || !id) {
    const pathname = urlObj.pathname || "";
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

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return htmlResponse({
      title,
      description,
      image,
      url: pageUrl
    });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // helper pra montar url do storage
  const buildStorageUrl = (raw) => {
    if (!raw) return null;
    if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
    if (raw.startsWith("event-photos/")) {
      return `${supabaseUrl}/storage/v1/object/public/event-photos/${raw.replace(
        /^event-photos\//,
        ""
      )}`;
    }
    return `${supabaseUrl}/storage/v1/object/public/photos/${raw.replace(/^photos\//, "")}`;
  };

  // helper pra saber se é foto "de usuário" (seu caso do evento 32)
  const isUserPhoto = (urlStr) => {
    if (!urlStr) return false;
    return urlStr.includes("/storage/v1/object/public/photos/");
  };

  // =========================================
  // EVENTO
  // =========================================
  if (type === "event" && id) {
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
        partners (
          id,
          name,
          photos
        )
      `
      )
      .eq("id", id)
      .single();

    if (!error && event) {
      title = event.title || title;
      description =
        event.description ||
        `Participe de uma experiência gastronômica${
          event.partners?.name ? ` em ${event.partners.name}` : ""
        }.`;

      // 1. candidatos do evento
      let eventCandidate =
        event.photo ||
        event.banner ||
        (Array.isArray(event.photos) && event.photos.length > 0 ? event.photos[0] : null);

      // 2. candidato do restaurante/parceiro
      let partnerCandidate =
        event.partners?.photos && event.partners.photos.length > 0
          ? event.partners.photos[0]
          : null;

      // regra: se a foto do evento for de user (bucket photos) mas o restaurante tem foto → usa a do restaurante
      let finalImage = null;
      if (eventCandidate && isUserPhoto(buildStorageUrl(eventCandidate)) && partnerCandidate) {
        finalImage = buildStorageUrl(partnerCandidate);
      } else if (eventCandidate) {
        finalImage = buildStorageUrl(eventCandidate);
      } else if (partnerCandidate) {
        finalImage = buildStorageUrl(partnerCandidate);
      }

      if (finalImage) {
        image = finalImage;
      }

      pageUrl = `${baseUrl}/event/${event.id}`;
    }

    return htmlResponse({
      title,
      description,
      image,
      url: pageUrl
    });
  }

  // =========================================
  // RESTAURANTE
  // =========================================
  if (type === "restaurant" && id) {
    const { data: partner, error } = await supabase
      .from("partners")
      .select("id, name, description, photos")
      .eq("id", id)
      .single();

    if (!error && partner) {
      title = partner.name || title;
      description =
        partner.description ||
        `Conheça ${partner.name || "este restaurante"} e viva experiências gastronômicas únicas.`;

      if (partner.photos && partner.photos.length > 0) {
        image = buildStorageUrl(partner.photos[0]);
      }

      pageUrl = `${baseUrl}/restaurant/${partner.id}`;
    }

    return htmlResponse({
      title,
      description,
      image,
      url: pageUrl
    });
  }

  // fallback
  return htmlResponse({
    title,
    description,
    image,
    url: pageUrl
  });
}

function htmlResponse({ title, description, image, url }) {
  const html = `
<!DOCTYPE html>
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
    <meta property="og:url" content="${escapeHtml(url)}" />
    <meta property="og:site_name" content="Mesapra2" />
    <meta property="og:locale" content="pt_BR" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(image)}" />

    <script>window.location.href="${escapeHtml(url)}";</script>
  </head>
  <body>
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(description)}</p>
    <img src="${escapeHtml(image)}" alt="${escapeHtml(title)}" style="max-width:100%;height:auto" />
  </body>
</html>
  `.trim();

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" }
  });
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
