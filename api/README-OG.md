# API de Open Graph Images (og.js)

## 📋 Resumo

API serverless (Vercel) que gera metatags dinâmicas (Open Graph) para eventos e restaurantes, permitindo preview com imagens personalizadas no WhatsApp, Facebook, Twitter, etc.

## 🔧 Correções Implementadas (2025-11-04)

### Problema Original
Links de eventos (`app.mesapra2.com/event/??`) estavam usando `og-default.jpg` em vez da imagem do restaurante.

### Causa Raiz Identificada
1. **Variáveis de ambiente incorretas** - A API buscava `NEXT_PUBLIC_*` mas o projeto usa `VITE_*`
2. **Eventos sem partner_id** - Eventos tipo "particular" e "crusher" não têm restaurante associado
3. **Falta de logs** - Sem visibilidade do que estava acontecendo em produção

### Soluções Aplicadas

#### ✅ 1. Busca Robusta do Partner (fallback strategy)
```javascript
// ESTRATÉGIA 1: Tentar com foreign key
const event = await supabase
  .from("events")
  .select("*, partners(...)")
  .eq("id", id)
  .single();

// ESTRATÉGIA 2: Se FK falhar, buscar direto
if (!event.partners && event.partner_id) {
  const partner = await supabase
    .from("partners")
    .select("*")
    .eq("id", event.partner_id)
    .single();
}
```

**Benefício**: Garante que a imagem do restaurante seja encontrada mesmo se houver problemas com a foreign key.

#### ✅ 2. Suporte a Múltiplas Convenções de Env Vars
```javascript
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||  // Compatibilidade Next.js
  process.env.VITE_SUPABASE_URL ||         // Padrão Vite
  'https://ksmnfhenhppasfcikefd.supabase.co'; // Fallback
```

**Benefício**: Funciona tanto em dev quanto em produção, independente de como as env vars são configuradas.

#### ✅ 3. Logs Detalhados para Debug
```javascript
console.log('[OG] === Nova requisição ===');
console.log('[OG] Buscando evento ID:', id);
console.log('[OG] Evento encontrado:', event.title);
console.log('[OG] Partner ID:', event.partner_id);
console.log('[OG] Usando imagem do partner:', partnerImage);
console.log('[OG] === Resultado final ===');
```

**Benefício**: Logs visíveis no painel do Vercel permitem debug em produção.

#### ✅ 4. Função Helper Melhorada
A função `getPartnerImage()` agora:
- Valida e limpa URLs (trim)
- Suporta ambos `avatar_url` (novo) e `photos` (legado)
- Detecta URLs completas vs. paths do storage
- Loga cada decisão tomada

## 🧪 Como Testar

### Teste Local (antes do deploy)
```bash
# 1. Testar lógica completa com eventos reais
node test-og-api.js

# 2. Debugar evento específico
node debug-og.js EVENT_ID
```

### Teste em Produção

1. **Compartilhar link no WhatsApp/Facebook**
   ```
   https://app.mesapra2.com/event/1
   ```

2. **Verificar logs no Vercel**
   - Acessar: https://vercel.com/seu-projeto/logs
   - Filtrar por: `[OG]`
   - Ver o que foi buscado e qual imagem foi usada

3. **Forçar revalidação do cache**
   - Facebook: https://developers.facebook.com/tools/debug/
   - Twitter: https://cards-dev.twitter.com/validator
   - WhatsApp: Enviar para "Mensagens arquivadas" e reabrir

## 🎯 Comportamento Esperado

### Eventos COM partner_id
**Exemplo**: Evento tipo "padrao" ou "institucional" em restaurante

```
URL: /event/1
Metatags:
  og:title = "Jantar teste 001"
  og:description = "Participe de uma experiência..."
  og:image = "https://www.belini-gastronomia.com.br/.../logo_belini.jpg" ✅
```

### Eventos SEM partner_id
**Exemplo**: Evento tipo "particular" ou "crusher" sem local fixo

```
URL: /event/22
Metatags:
  og:title = "Passeio de lancha"
  og:description = "Participe de uma experiência..."
  og:image = "https://app.mesapra2.com/og-default.jpg" ✅
```

**Isso é CORRETO** - eventos sem restaurante não têm imagem específica.

## 📦 Variáveis de Ambiente

### Desenvolvimento (local)
Arquivo: `.env.production`
```env
VITE_SUPABASE_URL=https://ksmnfhenhppasfcikefd.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### Produção (Vercel)
Configurar no painel do Vercel:

**Opção 1 - Compatibilidade Next.js** (recomendado para Vercel Functions):
```
NEXT_PUBLIC_SUPABASE_URL = https://ksmnfhenhppasfcikefd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJ...
```

**Opção 2 - Padrão Vite** (se não funcionar a opção 1):
```
VITE_SUPABASE_URL = https://ksmnfhenhppasfcikefd.supabase.co
VITE_SUPABASE_ANON_KEY = eyJ...
```

A API suporta **ambas** as convenções.

## 🔍 Debugging

### Cenário 1: Evento deveria ter imagem mas está usando default
1. Verificar se evento tem `partner_id`:
   ```bash
   node debug-og.js EVENT_ID
   ```
2. Ver logs no Vercel para entender o que aconteceu
3. Verificar se partner tem `avatar_url` ou `photos` no banco

### Cenário 2: API não está sendo chamada (sempre mostra cache)
1. Verificar `vercel.json` - regras de rewrite devem estar corretas
2. Testar com bot user-agent:
   ```bash
   curl -H "User-Agent: facebookexternalhit/1.1" https://app.mesapra2.com/event/1
   ```
3. Limpar cache do bot (Facebook Debug, Twitter Card Validator)

### Cenário 3: Variáveis de ambiente não carregam
1. Verificar logs: `[OG] Supabase URL: undefined`
2. Adicionar env vars no painel do Vercel
3. Fazer redeploy após adicionar env vars

## 📊 Estatísticas do Teste

Teste realizado em 2025-11-04:

- **3/3 eventos com partner_id**: ✅ Imagem do restaurante OK
- **5/5 eventos sem partner_id**: ✅ og-default.jpg (comportamento esperado)
- **Foreign keys**: ✅ Funcionando corretamente
- **Fallback direto**: ✅ Implementado como segurança adicional

## 🚀 Próximos Passos

1. **Deploy para produção**
   ```bash
   git add api/og.js
   git commit -m "fix: Improve OG image resolution with partner fallback"
   git push
   ```

2. **Configurar env vars no Vercel** (se ainda não estiver configurado)

3. **Testar em produção** compartilhando um link de evento

4. **Monitorar logs** no Vercel para confirmar que tudo está funcionando

5. **(Opcional) Adicionar imagens para eventos sem restaurante**
   - Criar imagens personalizadas por tipo de evento
   - Modificar lógica para usar essas imagens quando `partner_id` for null

## 📝 Arquivos Relacionados

- `api/og.js` - API principal (corrigida)
- `vercel.json` - Configuração de rewrites para bots
- `test-og-api.js` - Script de teste completo
- `debug-og.js` - Script de debug por evento
- `.env.production` - Env vars para testes locais

## 🆘 Suporte

Se após o deploy os eventos ainda estiverem usando `og-default.jpg`:

1. Pegue um ID de evento específico que está com problema
2. Execute: `node debug-og.js EVENT_ID`
3. Compartilhe o output completo + logs do Vercel
4. Verifique se o evento tem `partner_id` no banco de dados
