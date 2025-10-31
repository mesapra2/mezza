// ============================================
// 🎨 SOLUÇÃO: Open Graph Tags para Links Bonitos
// ============================================

// 1️⃣ EM EventDetails.jsx - ATUALIZE O <Helmet> EXISTENTE

// SUBSTITUA o Helmet atual por este:

<Helmet>
  {/* Meta tags básicas */}
  <title>{event.title} - Mesapra2</title>
  <meta name="description" content={event.description} />
  
  {/* Open Graph (Facebook, LinkedIn, WhatsApp) */}
  <meta property="og:type" content="website" />
  <meta property="og:url" content={`https://app.mesapra2.com/event/${event.id}`} />
  <meta property="og:title" content={event.title} />
  <meta property="og:description" content={event.description} />
  <meta property="og:site_name" content="Mesapra2 - Social Dining" />
  
  {/* 📸 IMAGEM DO EVENTO - Prioridade */}
  {event.event_photos && event.event_photos.length > 0 ? (
    <meta property="og:image" content={event.event_photos[0]} />
  ) : event.partner?.logo_url ? (
    <meta property="og:image" content={event.partner.logo_url} />
  ) : (
    <meta property="og:image" content="https://app.mesapra2.com/og-default.jpg" />
  )}
  
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content={event.title} />
  
  {/* Twitter Card */}
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content={`https://app.mesapra2.com/event/${event.id}`} />
  <meta name="twitter:title" content={event.title} />
  <meta name="twitter:description" content={event.description} />
  {event.event_photos && event.event_photos.length > 0 && (
    <meta name="twitter:image" content={event.event_photos[0]} />
  )}
  
  {/* WhatsApp (usa Open Graph) */}
  <meta property="og:locale" content="pt_BR" />
</Helmet>


// ============================================
// 2️⃣ CRIAR IMAGEM PADRÃO (FALLBACK)
// ============================================

/*
📸 IMPORTANTE: Você precisa de uma imagem padrão!

Opção A: Criar uma imagem no Canva (RECOMENDADO)
- Acesse: https://canva.com
- Tamanho: 1200x630px
- Conteúdo: Logo do Mesapra2 + texto atraente
- Exportar como JPG
- Fazer upload para: /public/og-default.jpg

Opção B: Usar serviço de geração automática
- https://og-image.vercel.app/
- Gera imagens OG automaticamente com texto

Opção C: Gerar programaticamente (avançado)
- Cloudinary, Imgix ou API própria
*/


// ============================================
// 3️⃣ NO index.html (FALLBACK GLOBAL)
// ============================================

// Adicione no <head> do seu index.html (public/index.html):

/*
<meta property="og:type" content="website" />
<meta property="og:url" content="https://app.mesapra2.com" />
<meta property="og:title" content="Mesapra2 - Social Dining" />
<meta property="og:description" content="Conectando pessoas através de experiências gastronômicas únicas" />
<meta property="og:image" content="https://app.mesapra2.com/og-default.jpg" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:site_name" content="Mesapra2" />
<meta property="og:locale" content="pt_BR" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Mesapra2 - Social Dining" />
<meta name="twitter:description" content="Conectando pessoas através de experiências gastronômicas únicas" />
<meta name="twitter:image" content="https://app.mesapra2.com/og-default.jpg" />
*/


// ============================================
// 4️⃣ TESTAR SE ESTÁ FUNCIONANDO
// ============================================

/*
🔍 FERRAMENTAS DE TESTE:

1. Facebook Debugger (MELHOR)
   https://developers.facebook.com/tools/debug/
   - Cole seu link
   - Clique "Fetch new information"
   - Vai mostrar preview + erros

2. Twitter Card Validator
   https://cards-dev.twitter.com/validator
   
3. LinkedIn Post Inspector
   https://www.linkedin.com/post-inspector/

4. WhatsApp (manual)
   - Envie o link pra você mesmo
   - Veja como aparece

⚠️ IMPORTANTE: 
- Pode levar alguns minutos para atualizar
- Use "Fetch new information" no Facebook Debugger para forçar
*/


// ============================================
// 5️⃣ CHECKLIST DE VALIDAÇÃO
// ============================================

/*
✅ Verificar:
[ ] Imagem tem 1200x630px (tamanho ideal)
[ ] Imagem está acessível publicamente (sem autenticação)
[ ] URL da imagem é HTTPS (não HTTP)
[ ] Título tem menos de 60 caracteres
[ ] Descrição tem entre 155-200 caracteres
[ ] Testado no Facebook Debugger
[ ] Testado enviando no WhatsApp

❌ Erros comuns:
- Imagem muito pequena (min: 200x200px)
- Imagem protegida por login
- URL com caracteres especiais não encodados
- Cache do Facebook (resolver com debugger)
*/


// ============================================
// 6️⃣ EXEMPLO DE IMAGEM PADRÃO (CANVA)
// ============================================

/*
📐 Template sugerido para Canva:

Tamanho: 1200 x 630px

Layout:
┌─────────────────────────────────┐
│                                 │
│        LOGO MESAPRA2           │
│                                 │
│   "Conecte-se através de       │
│    experiências únicas"         │
│                                 │
│   🍽️ Social Dining              │
│                                 │
│   app.mesapra2.com             │
│                                 │
└─────────────────────────────────┘

Cores: Gradiente roxo (#667eea → #764ba2)
Fonte: Inter ou Poppins (bold)
*/