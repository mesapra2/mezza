import { readFileSync } from 'fs';
import { join } from 'path';
import { cwd } from 'process';

/**
 * Vercel Serverless Function - api/og.js
 * Gera meta tags dinâmicas para compartilhamento em redes sociais
 */
export default async function handler(req, res) {
  const userAgent = req.headers['user-agent'] || '';
  const { event_id } = req.query;

  // Detecção de Bots
  const bots = [
    'facebookexternalhit',
    'facebot',
    'whatsapp',
    'whatsappbeta',
    'twitterbot',
    'linkedinbot',
    'slackbot',
    'telegrambot',
    'skypeuripreview',
    'discordbot',
    'googlebot',
    'bingbot',
    'bot',
    'crawler',
    'spider'
  ];
  
  const isBot = bots.some(bot => 
    userAgent.toLowerCase().includes(bot.toLowerCase())
  );

  // Configuração das Meta Tags
  let title = 'Mesapra2 - Social Dining';
  let description = 'Conectando pessoas através de experiências gastronômicas únicas';
  let image = 'https://app.mesapra2.com/og-default.jpg';
  let fullUrl = 'https://app.mesapra2.com';
  
  if (event_id) {
    title = `Evento #${event_id} - Mesapra2`;
    description = `Participe deste evento incrível! Conecte-se com pessoas através de experiências gastronômicas únicas.`;
    fullUrl = `https://app.mesapra2.com/event/${event_id}`;
  }

  try {
    // Carregar o index.html
    let html;
    
    try {
      html = readFileSync(join(cwd(), 'index.html'), 'utf-8');
    } catch (error) {
      html = readFileSync('/var/task/index.html', 'utf-8');
    }

    // Injetar Tags SOMENTE se for um Bot
    if (isBot) {
      const ogTags = [
        `<meta property="og:title" content="${title}" />`,
        `<meta property="og:description" content="${description}" />`,
        `<meta property="og:url" content="${fullUrl}" />`,
        `<meta property="og:image" content="${image}" />`,
        `<meta property="og:image:secure_url" content="${image}" />`,
        `<meta property="og:image:width" content="1200" />`,
        `<meta property="og:image:height" content="630" />`,
        `<meta property="og:type" content="${event_id ? 'article' : 'website'}" />`,
        `<meta property="og:site_name" content="Mesapra2" />`,
        `<meta name="twitter:card" content="summary_large_image" />`,
        `<meta name="twitter:title" content="${title}" />`,
        `<meta name="twitter:description" content="${description}" />`,
        `<meta name="twitter:image" content="${image}" />`
      ].join('\n    ');
      
      html = html.replace(/<title>.*?<\/title>/, `<title>${title}</title>`);
      html = html.replace('</head>', `    ${ogTags}\n  </head>`);
    }
    
    // Servir o HTML
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.status(200).send(html);

  } catch (error) {
    console.error('Erro ao processar HTML:', error.message);
    
    // HTML de fallback com meta tags
    const fallbackHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:url" content="${fullUrl}" />
  <meta property="og:image" content="${image}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:type" content="${event_id ? 'article' : 'website'}" />
  <meta property="og:site_name" content="Mesapra2" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${image}" />
</head>
<body>
  <script>window.location.href = '${fullUrl}';</script>
  <noscript>
    <meta http-equiv="refresh" content="0; url=${fullUrl}">
  </noscript>
</body>
</html>`;
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(fallbackHtml);
  }
}