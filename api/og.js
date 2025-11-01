// /api/og.js
/* eslint-env node */

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  console.log("🚀 [OG] Iniciando handler");
  console.log("📍 [OG] URL:", req.url);
  console.log("🔍 [OG] Query:", req.query);

  // Pega os IDs da query string
  const { event_id, partner_id } = req.query || {};

  console.log("🎯 [OG] event_id:", event_id);
  console.log("🏪 [OG] partner_id:", partner_id);

  // Valores padrão
  let title = "Mesapra2 - Social Dining";
  let description = "Conectando pessoas através de experiências gastronômicas únicas.";
  let image = "https://app.mesapra2.com/og-default.jpg";
  let url = "https://app.mesapra2.com/";

  // Busca variáveis de ambiente com TODAS as variações possíveis
  const supabaseUrl = 
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL || 
    process.env.SUPABASE_URL;
    
  const supabaseAnonKey = 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY || 
    process.env.SUPABASE_ANON_KEY;

  console.log("🔑 [OG] Verificando variáveis de ambiente:");
  console.log("   NEXT_PUBLIC_SUPABASE_URL:", !!process.envNEXT_PUBLIC_SUPABASE_URL);
  console.log("   NEXT_PUBLIC_SUPABASE_URL:", !!process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log("   SUPABASE_URL:", !!process.env.SUPABASE_URL);
  console.log("   SUPABASE_URL:", !!process.env.SUPABASE_URL);
  console.log("   NEXT_PUBLIC_SUPABASE_ANON_KEY:", !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  console.log("   NEXT_PUBLIC_SUPABASE_ANON_KEY:", !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  console.log("   SUPABASE_ANON_KEY:", !!process.env.SUPABASE_ANON_KEY);
  console.log("   SUPABASE_ANON_KEY:", !!process.env.SUPABASE_ANON_KEY);
  console.log("   ✅ supabaseUrl encontrada:", !!supabaseUrl);
  console.log("   ✅ supabaseAnonKey encontrada:", !!supabaseAnonKey);

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("❌ [OG] Variáveis de ambiente não configuradas!");
    return sendMetaTags(res, title, description, image, url);
  }

  console.log("✅ [OG] Supabase conectado");
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // =========================================================
  // CENÁRIO 1: /event/:id -> pegar foto do restaurante
  // =========================================================
  if (event_id) {
    console.log("🎉 [OG] Buscando evento:", event_id);
    
    try {
      const { data: event, error } = await supabase
        .from("events")
        .select(`
          id,
          title,
          description,
          partner:partners!inner (
            id,
            name,
            photos
          )
        `)
        .eq("id", event_id)
        .single();

      console.log("📦 [OG] Resultado do evento:", JSON.stringify(event, null, 2));
      
      if (error) {
        console.error("❌ [OG] Erro ao buscar evento:", error.message);
        return sendMetaTags(res, title, description, image, url);
      }

      if (!event) {
        console.warn("⚠️ [OG] Evento não encontrado");
        return sendMetaTags(res, title, description, image, url);
      }

      // Monta título
      title = event.title || `Evento no Mesapra2`;
      
      // Monta descrição
      const partnerName = event.partner?.name || "";
      description = event.description || 
        (partnerName ? `Participe de uma experiência gastronômica incrível em ${partnerName}.` : 
         "Participe de uma experiência gastronômica incrível.");

      // Pega foto do restaurante (LINK EXTERNO prioritário)
      if (event.partner?.photos && event.partner.photos.length > 0) {
        const photoUrl = event.partner.photos[0];
        console.log("🖼️ [OG] Foto encontrada:", photoUrl);
        
        if (photoUrl.startsWith("http://") || photoUrl.startsWith("https://")) {
          // Usa o link externo direto
          image = photoUrl;
          console.log("✅ [OG] Usando link externo");
        } else {
          // Tenta montar do bucket avatars
          image = `${supabaseUrl}/storage/v1/object/public/avatars/${photoUrl}`;
          console.log("📦 [OG] Montando do bucket avatars");
        }
      } else {
        console.warn("⚠️ [OG] Nenhuma foto encontrada para o partner");
      }

      url = `https://app.mesapra2.com/event/${event.id}`;
      console.log("✅ [OG] Meta tags do evento montadas com sucesso");

    } catch (err) {
      console.error("❌ [OG] Exceção ao buscar evento:", err);
      return sendMetaTags(res, title, description, image, url);
    }
  }

  // =========================================================
  // CENÁRIO 2: /restaurant/:id -> foto do restaurante
  // =========================================================
  else if (partner_id) {
    console.log("🏪 [OG] Buscando restaurante:", partner_id);
    
    try {
      const { data: partner, error } = await supabase
        .from("partners")
        .select("id, name, description, photos")
        .eq("id", partner_id)
        .single();

      console.log("📦 [OG] Resultado do restaurante:", JSON.stringify(partner, null, 2));

      if (error) {
        console.error("❌ [OG] Erro ao buscar restaurante:", error.message);
        return sendMetaTags(res, title, description, image, url);
      }

      if (!partner) {
        console.warn("⚠️ [OG] Restaurante não encontrado");
        return sendMetaTags(res, title, description, image, url);
      }

      title = partner.name || `Restaurante no Mesapra2`;
      description = partner.description || 
        `Conheça ${partner.name || "este restaurante"} e descubra experiências gastronômicas incríveis.`;

      // Pega foto do restaurante (LINK EXTERNO prioritário)
      if (partner.photos && partner.photos.length > 0) {
        const photoUrl = partner.photos[0];
        console.log("🖼️ [OG] Foto encontrada:", photoUrl);
        
        if (photoUrl.startsWith("http://") || photoUrl.startsWith("https://")) {
          // Usa o link externo direto
          image = photoUrl;
          console.log("✅ [OG] Usando link externo");
        } else {
          // Tenta montar do bucket avatars
          image = `${supabaseUrl}/storage/v1/object/public/avatars/${photoUrl}`;
          console.log("📦 [OG] Montando do bucket avatars");
        }
      } else {
        console.warn("⚠️ [OG] Nenhuma foto encontrada para o partner");
      }

      url = `https://app.mesapra2.com/restaurant/${partner.id}`;
      console.log("✅ [OG] Meta tags do restaurante montadas com sucesso");

    } catch (err) {
      console.error("❌ [OG] Exceção ao buscar restaurante:", err);
      return sendMetaTags(res, title, description, image, url);
    }
  }

  // =========================================================
  // CENÁRIO 3: Default (homepage)
  // =========================================================
  else {
    console.log("🏠 [OG] Usando meta tags padrão (homepage)");
  }

  // Envia as meta tags
  console.log("📤 [OG] Enviando meta tags:");
  console.log("   Title:", title);
  console.log("   Description:", description);
  console.log("   Image:", image);
  console.log("   URL:", url);

  return sendMetaTags(res, title, description, image, url);
}

// ------------------------------------------------------------------
// Envia HTML com meta tags
// ------------------------------------------------------------------
function sendMetaTags(res, title, description, image, url) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader(
    "Cache-Control",
    "public, max-age=300, s-maxage=600, stale-while-revalidate=86400"
  );

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    
    <!-- Basic Meta Tags -->
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    
    <!-- Open Graph Meta Tags -->
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Mesapra2" />
    <meta property="og:locale" content="pt_BR" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${escapeHtml(url)}" />
    <meta property="og:image" content="${escapeHtml(image)}" />
    <meta property="og:image:secure_url" content="${escapeHtml(image)}" />
    <meta property="og:image:type" content="image/jpeg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${escapeHtml(title)}" />
    
    <!-- Twitter Card Meta Tags -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(image)}" />
    <meta name="twitter:image:alt" content="${escapeHtml(title)}" />
    
    <!-- WhatsApp Meta Tags -->
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    
    <!-- Canonical URL -->
    <link rel="canonical" href="${escapeHtml(url)}" />
  </head>
  <body>
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(description)}</p>
    <img src="${escapeHtml(image)}" alt="${escapeHtml(title)}" style="max-width: 100%; height: auto;" />
  </body>
</html>`;

  res.status(200).send(html);
}

// ------------------------------------------------------------------
// Escapa HTML para prevenir XSS
// ------------------------------------------------------------------
function escapeHtml(text) {
  if (!text) return "";
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return String(text).replace(/[&<>"']/g, (m) => map[m]);
}