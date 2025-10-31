import { promises as fs } from 'fs';
import path from 'path';
import { process } from 'node:process';

/**
 * Vercel Serverless Function - api/og.js
 * CORREÇÃO FINAL (O path é a raiz, não 'dist', 
 * porque o outputDirectory move o 'dist' para a raiz)
 */
export default async function handler(req, res) {
  const userAgent = req.headers['user-agent'] || '';
  const { event_id } = req.query;

  // --- 1. Detecção de Bots ---
  const bots = [
    'facebookexternalhit', 'facebot', 'whatsapp', 'whatsappbeta', 'twitterbot',
    'linkedinbot', 'slackbot', 'telegrambot', 'skypeuripreview', 'discordbot',
    'googlebot', 'bingbot', 'bot', 'crawler', 'spider'
  ];
  const isBot = bots.some(bot => 
    userAgent.toLowerCase().includes(bot.toLowerCase())
  );

  // --- 2. Configuração das Meta Tags (só para bots) ---
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
    // --- 3. Carregar o index.html de produção ---
    // 
    // ***** A CORREÇÃO FINAL DE VERDADE ESTÁ AQUI *****
    // O Vercel move o conteúdo de 'dist' para a raiz ('/').
    const indexPath = path.join(process.cwd(), 'index.html');
    //
    // *************************************************
    
    let html = await fs.readFile(indexPath, 'utf-8');

    // --- 4. Injetar Tags SOMENTE se for um Bot ---
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
        `<meta name="twitter:image" content="${image}" />`,
      ].join('\n');
      
      html = html.replace(/<title>.*?<\/title>/, `<title>${title}</title>`);
      html = html.replace('</head>', `${ogTags}\n</head>`);
    }
    
    // --- 5. Servir o HTML (modificado ou não) ---
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.status(200).send(html);

  } catch (e) {
    console.error('ERRO AO LER O index.html OU GERAR TAGS:', e.message);
    res.status(500).send(`Erro interno ao gerar tags: ${e.message}`);
  }
}