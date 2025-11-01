/* eslint-env node */


import { createClient } from "@supabase/supabase-js";

export const config = { runtime: "edge" };

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const event_id = searchParams.get("event_id");
  const partner_id = searchParams.get("partner_id");

  let title = "Mesapra2 — Jantares sociais que conectam pessoas";
  let description = "Conheça pessoas incríveis em jantares sociais com o aplicativo Mesapra2.";
  let image = "https://app.mesapra2.com/og-default.jpg";
  let url = "https://app.mesapra2.com/";

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  // ===== EVENTO =====
  if (event_id) {
    const { data: event } = await supabase
      .from("events")
      .select(`
        id,
        title,
        description,
        partners(id,name,photos)
      `)
      .eq("id", event_id)
      .single();

    if (event) {
      title = event.title || title;
      description =
        event.description ||
        `Participe de uma experiência gastronômica incrível com ${event.partners?.name || "restaurantes parceiros"}.`;

      const photo = event.partners?.photos?.[0];
      if (photo)
        image = photo.startsWith("http")
          ? photo
          : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/${photo}`;

      url = `https://app.mesapra2.com/event/${event.id}`;
    }
  }

  // ===== RESTAURANTE =====
  if (partner_id) {
    const { data: partner } = await supabase
      .from("partners")
      .select("id,name,description,photos")
      .eq("id", partner_id)
      .single();

    if (partner) {
      title = partner.name || title;
      description =
        partner.description ||
        `Conheça ${partner.name || "este restaurante"} e viva experiências únicas.`;

      const photo = partner.photos?.[0];
      if (photo)
        image = photo.startsWith("http")
          ? photo
          : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/${photo}`;

      url = `https://app.mesapra2.com/restaurant/${partner.id}`;
    }
  }

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>${title}</title>
<meta name="description" content="${description}" />
<meta property="og:type" content="website" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${description}" />
<meta property="og:url" content="${url}" />
<meta property="og:image" content="${image}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${title}" />
<meta name="twitter:description" content="${description}" />
<meta name="twitter:image" content="${image}" />
</head>
<body>
<h1>${title}</h1>
<p>${description}</p>
<img src="${image}" alt="${title}" style="max-width:100%;height:auto" />
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" }
  });
}
