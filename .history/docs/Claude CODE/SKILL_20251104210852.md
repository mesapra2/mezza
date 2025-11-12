# Mesapra2 - Social Dining Platform - Complete Architecture

**Engenheiro sênior full stack e gerente técnico** responsável por concluir e aprimorar o aplicativo Mesapra2.com usando React, Supabase, Node.js e Vercel.

## 1. Visão Geral do Projeto

Mesapra2 é uma plataforma de **social dining** que conecta pessoas através de eventos gastronômicos em restaurantes. O app permite que usuários criem eventos, convidem participantes, façam check-in com senha, chat em tempo real, avaliações, e gerenciem todo o fluxo de eventos sociais.

### Stack Tecnológica Principal
- **Frontend**: React 18 + Vite
- **Linguagem**: TypeScript (strict mode) + JavaScript
- **Estilização**: Tailwind CSS + shadcn/ui
- **Backend/BaaS**: Supabase (PostgreSQL, Auth, Storage, Realtime)
- **Deploy**: Vercel
- **Roteamento**: React Router v6
- **Gerenciamento de Estado**: Context API (AuthContext, PremiumContext)
- **Notificações**: Push Notifications + Realtime
- **SMS**: Twilio Service
- **Testes**: Jest + Vitest + React Testing Library
- **Reverse Proxy**: Nginx

### URLs & Repositório
- **Produção**: https://app.mesapra2.com
- **GitHub**: https://github.com/mesapra2/mezza
- **Email**: mezapra2@gmail.com

---

## 2. Estrutura Completa do Projeto

```markdown
App.Mesapra2.com/
├── Nginx.conf                          # Configuração do servidor Nginx
├── api/
│   └── og.js                          # Open Graph meta tags dinâmicas
├── components.json                     # Configuração shadcn/ui
├── estrutura.md                        # Documentação da estrutura
├── favicon.svg                         # Favicon do site
├── index.html                          # HTML principal
├── jest.config.cjs                     # Configuração Jest
├── jsconfig.json                       # Configuração JavaScript paths
├── logo.svg                            # Logo vetorial
├── mesapra2-skill/
│   ├── SKILL.md                       # Esta documentação
│   └── SKILL.zip                      # Versão compactada
├── migrate.js                          # Scripts de migração de dados
├── package.json                        # Dependências e scripts
├── package-lock.json                   # Lock de dependências
├── politicas.html                      # Página de políticas
├── postcss.config.js                   # Config PostCSS para Tailwind
├── public/
│   ├── og-default.jpg                 # Open Graph imagem default
│   └── og-default.png                 # Open Graph imagem PNG
├── src/
│   ├── App.jsx                        # Componente raiz + rotas
│   ├── App.test.jsx                   # Testes do App
│   ├── Main.jsx                       # Entry point React
│   ├── ProtectedRoutes.jsx            # HOC para rotas protegidas
│   │
│   ├── __mocks__/
│   │   └── supabaseClient.ts          # Mock Supabase para testes
│   │
│   ├── assets/                        # Imagens e recursos estáticos
│   │   ├── logo.png
│   │   ├── logo_social.png
│   │   ├── logovelha.png
│   │   ├── rest21.jpg                 # Imagens de restaurantes
│   │   ├── rest22.jpg
│   │   └── rest23.jpg
│   │
│   ├── components/                    # Componentes compartilhados globais
│   │   ├── Layout.jsx                 # Layout principal com nav
│   │   ├── NotificationBell.jsx       # Ícone de notificações
│   │   ├── NotificationDropdown.jsx   # Dropdown de notificações
│   │   ├── ProtectedRoute.jsx         # Wrapper de rota protegida
│   │   └── ui/                        # shadcn/ui components
│   │       └── dropdown-menu.tsx
│   │
│   ├── config/                        # Arquivos de configuração
│   │   ├── hashtagsConfig.js          # Hashtags disponíveis por categoria
│   │   ├── premiumFeatures.js         # Features premium vs comuns
│   │   └── userTypes.js               # Tipos de usuário (common, premium, partner)
│   │
│   ├── contexts/                      # React Contexts
│   │   ├── AuthContext.jsx            # Autenticação global
│   │   └── PremiumContext.jsx         # Estado premium features
│   │
│   ├── features/                      # Arquitetura por features
│   │   ├── partner/                   # Features específicas de parceiros
│   │   │   ├── components/
│   │   │   └── pages/
│   │   ├── shared/                    # Features compartilhadas
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── pages/
│   │   │   └── services/
│   │   └── user/                      # Features específicas de usuários
│   │       ├── components/
│   │       ├── pages/
│   │       └── services/
│   │
│   ├── hooks/                         # Custom React Hooks
│   │   ├── useEventStatus.js          # Hook status de eventos
│   │   ├── useFeaturesAccess.js       # Hook verificação de acesso a features
│   │   ├── useParticipation.js        # Hook participação em eventos
│   │   ├── usePremiumFeatures.js      # Hook features premium
│   │   └── userNotification.js        # Hook sistema de notificações
│   │
│   ├── index.css                      # Estilos globais + Tailwind
│   │
│   ├── lib/                           # Bibliotecas core
│   │   ├── supabaseClient.ts          # Cliente Supabase configurado
│   │   └── utils.ts                   # Utilitários TypeScript
│   │
│   ├── services/                      # Camada de serviços (business logic)
│   │   ├── ChatCleanupService.ts      # Limpeza de chats antigos
│   │   ├── EventPhotosService.ts      # Gestão de fotos de eventos
│   │   ├── EventSecurityService.ts    # Segurança de eventos (senhas)
│   │   ├── EventStatusService.ts      # Gestão de status de eventos
│   │   ├── NotificationService.ts     # Serviço de notificações
│   │   ├── ParticipationService.ts    # Participação em eventos
│   │   ├── ParticipationService.test.ts # Testes do ParticipationService
│   │   ├── PartnerEventService.ts     # Eventos de parceiros
│   │   ├── PushNotificationService.ts # Push notifications
│   │   ├── RatingService.ts           # Sistema de avaliações
│   │   ├── TrustScoreService.ts       # Score de confiança de usuários
│   │   ├── WaitingListService.ts      # Lista de espera
│   │   ├── authService.ts             # Serviço de autenticação
│   │   └── twilioService.js           # Integração SMS via Twilio
│   │
│   ├── setupTests.ts                  # Setup global de testes
│   │
│   ├── test/
│   │   └── setup.js                   # Setup adicional de testes
│   │
│   └── utils/                         # Utilitários diversos
│       ├── abi/                       # ABIs de smart contracts (se usar blockchain)
│       ├── avatarHelper.js            # Helpers para avatares
│       ├── chatAvailability.js        # Disponibilidade de chat
│       ├── featureGates.js            # Feature flags
│       ├── index.js                   # Exports dos utils
│       ├── supabaseClient.js          # Cliente Supabase JS (legacy)
│       ├── utils.js                   # Utilitários gerais
│       └── validateCNPJ.js            # Validação de CNPJ
│
├── tailwind.config.js                  # Configuração Tailwind CSS
├── tsconfig.json                       # TypeScript config
├── tsconfig.node.json                  # TypeScript config para Node
├── vercel.json                         # Configuração Vercel
├── vite.config.js                      # Configuração Vite
└── vite.svg                            # Logo Vite
```

---

## 3. Arquitetura do Banco de Dados (Supabase)

### 3.1 Principais Tabelas

#### **profiles**
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  phone TEXT,
  user_type TEXT NOT NULL DEFAULT 'common', -- 'common' | 'premium' | 'partner'
  trust_score DECIMAL(3,2) DEFAULT 0.00, -- Score de confiança 0-5
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_user_type ON profiles(user_type);
CREATE INDEX idx_profiles_trust_score ON profiles(trust_score);
```

#### **events**
```sql
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_time TIME NOT NULL,
  location TEXT NOT NULL,
  restaurant_id UUID REFERENCES restaurants(id),
  host_id UUID NOT NULL REFERENCES profiles(id),
  max_participants INTEGER NOT NULL DEFAULT 10,
  current_participants INTEGER DEFAULT 0,
  event_type TEXT NOT NULL DEFAULT 'common', -- 'common' | 'premium'
  event_entry_password TEXT, -- 4 dígitos
  hashtags TEXT[] DEFAULT '{}', -- Array de hashtags
  status TEXT DEFAULT 'active', -- 'active' | 'cancelled' | 'completed' | 'full'
  requires_approval BOOLEAN DEFAULT FALSE,
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_event_type CHECK (event_type IN ('common', 'premium')),
  CONSTRAINT valid_status CHECK (status IN ('active', 'cancelled', 'completed', 'full')),
  CONSTRAINT valid_password CHECK (event_entry_password ~ '^[0-9]{4}$')
);

CREATE INDEX idx_events_date ON events(event_date);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_host ON events(host_id);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_hashtags ON events USING gin(hashtags);
```

#### **restaurants**
```sql
CREATE TABLE restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  cuisine_type TEXT,
  price_range INTEGER CHECK (price_range BETWEEN 1 AND 4),
  rating DECIMAL(2,1) CHECK (rating BETWEEN 0 AND 5),
  photo_url TEXT,
  owner_id UUID REFERENCES profiles(id),
  cnpj TEXT UNIQUE,
  is_verified BOOLEAN DEFAULT FALSE,
  is_partner BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_restaurants_cuisine ON restaurants(cuisine_type);
CREATE INDEX idx_restaurants_partner ON restaurants(is_partner);
```

#### **event_participants**
```sql
CREATE TABLE event_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending', -- 'pending' | 'confirmed' | 'checked_in' | 'cancelled' | 'waiting'
  checked_in_at TIMESTAMPTZ,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  review TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(event_id, user_id), -- ⚠️ CONSTRAINT CRÍTICO - previne duplicação
  CONSTRAINT valid_participant_status CHECK (status IN ('pending', 'confirmed', 'checked_in', 'cancelled', 'waiting'))
);

CREATE INDEX idx_participants_event ON event_participants(event_id);
CREATE INDEX idx_participants_user ON event_participants(user_id);
CREATE INDEX idx_participants_status ON event_participants(status);
```

#### **waiting_list**
```sql
CREATE TABLE waiting_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  status TEXT DEFAULT 'waiting', -- 'waiting' | 'notified' | 'expired' | 'joined'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  notified_at TIMESTAMPTZ,
  
  UNIQUE(event_id, user_id)
);

CREATE INDEX idx_waiting_list_event ON waiting_list(event_id);
CREATE INDEX idx_waiting_list_position ON waiting_list(event_id, position);
```

#### **notifications**
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL, -- 'event' | 'message' | 'system' | 'rating'
  reference_id UUID, -- ID do evento/chat relacionado
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_notification_type CHECK (type IN ('event', 'message', 'system', 'rating'))
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
```

#### **event_photos**
```sql
CREATE TABLE event_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  photo_url TEXT NOT NULL,
  caption TEXT,
  is_approved BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_event_photos_event ON event_photos(event_id);
```

#### **event_chat**
```sql
CREATE TABLE event_chat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_event ON event_chat(event_id, created_at DESC);
```

#### **ratings**
```sql
CREATE TABLE ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  rater_id UUID NOT NULL REFERENCES profiles(id),
  rated_user_id UUID NOT NULL REFERENCES profiles(id),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(event_id, rater_id, rated_user_id)
);

CREATE INDEX idx_ratings_rated_user ON ratings(rated_user_id);
```

#### **hashtags**
```sql
CREATE TABLE hashtags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL, -- 'common' | 'premium'
  emoji TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_hashtag_category CHECK (category IN ('common', 'premium'))
);

CREATE INDEX idx_hashtags_category ON hashtags(category);
```

---

## 4. Serviços Principais (Services)

### ParticipationService.ts
**Gerencia participação de usuários em eventos**

**⚠️ PROBLEMA CONHECIDO**: Race condition causando duplicação (erro 23505)
- **Localização**: Linha ~265
- **Solução**: Usar debounce no frontend + tratar erro 23505 como "já inscrito"

### EventSecurityService.ts
**Gerencia senhas de check-in**

**⚠️ PROBLEMA CONHECIDO**: Comparação string vs number
- **Solução**: `String(event.event_entry_password) === String(password)`

### NotificationService.ts
**Sistema de notificações em tempo real**

### WaitingListService.ts
**Gerencia lista de espera quando eventos estão cheios**

### RatingService.ts
**Sistema de avaliações entre participantes**

### TrustScoreService.ts
**Calcula score de confiança baseado em:**
- Eventos participados
- Check-ins realizados
- Cancelamentos
- Avaliações recebidas

### EventStatusService.ts
**Gerencia status de eventos (active, completed, cancelled)**

### PushNotificationService.ts
**Push notifications via Web Push API**

### twilioService.js
**Integração SMS via Twilio**

### ChatCleanupService.ts
**Limpeza de mensagens antigas**

### EventPhotosService.ts
**Upload e gestão de fotos de eventos**

---

## 5. Configurações

### userTypes.js
```javascript
export const USER_TYPES = {
  COMMON: 'common',
  PREMIUM: 'premium',
  PARTNER: 'partner'
};
```

### hashtagsConfig.js
**Hashtags organizadas por categoria (common/premium)**

### premiumFeatures.js
**Define features disponíveis por tipo de usuário:**
- Eventos por mês
- Criar eventos em qualquer lugar
- Número de hashtags
- Prioridade na lista de espera
- Analytics

---

## 6. Hooks Customizados

- **useEventStatus**: Status de eventos + updates em tempo real
- **useFeaturesAccess**: Verificação de acesso a features
- **useParticipation**: Participação em eventos
- **usePremiumFeatures**: Features premium do usuário
- **userNotification**: Sistema de notificações

---

## 7. Contexts

### AuthContext
**Estado global de autenticação:**
- user
- profile
- signIn/signOut
- isAuthenticated
- isPremium
- isPartner

### PremiumContext
**Estado de features premium baseado no tipo de usuário**

---

## 8. Fluxos Principais

### Participar de Evento
1. Verificar se já está inscrito
2. Verificar vagas disponíveis
3. Inserir em event_participants
4. Notificar host
5. Atualizar contadores

### Check-in
1. Validar senha (4 dígitos)
2. Verificar participação
3. Atualizar status para 'checked_in'
4. Liberar acesso ao chat
5. Notificar host

### Lista de Espera
1. Evento cheio → oferecer lista de espera
2. Adicionar com posição
3. Quando vaga abrir → notificar próximo
4. Usuário tem 1 hora para confirmar

### Sistema de Avaliações
1. Evento concluído
2. Notificar participantes
3. Avaliar outros participantes (1-5 estrelas)
4. Recalcular trust_score
5. Notificar avaliado

---

## 9. Problemas Conhecidos

### 🔴 P0 - Críticos

**1. Race Condition em ParticipationService**
- Cliques duplos causam duplicação
- Erro 23505 (duplicate key)
- **Solução**: Debounce + tratar erro

**2. Validação de Senha Check-in**
- Comparação string vs number falha
- **Solução**: Converter ambos para string

**3. Memory Leaks em Subscriptions**
- Esquecer unsubscribe causa leaks
- **Solução**: Sempre adicionar cleanup no useEffect

### 🟡 P1 - Importantes

**4. Performance: Queries N+1**
- Listar eventos busca participantes separadamente
- **Solução**: Usar joins no Supabase

**5. Realtime: Desconexões**
- Conexões WebSocket caem
- **Solução**: Implementar heartbeat

---

## 10. Deploy

### Vercel
- Build: `npm run build`
- Output: `dist/`
- Environment variables no dashboard

### Nginx
- Reverse proxy configurado
- SSL/HTTPS habilitado
- Gzip compression
- SPA routing via try_files

---

## 11. Testes

### Frameworks
- **Vitest** (primary)
- **Jest** (fallback)
- **React Testing Library**

### Coverage Target
- Branches: 70%
- Functions: 70%
- Lines: 70%

---

## 12. Comandos

```bash
npm run dev          # Desenvolvimento
npm run build        # Build produção
npm run test         # Rodar testes
npm run lint         # Verificar código
npm run type-check   # Verificar TypeScript
```

---

## 13. Instruções para Claude Code

### ✅ SEMPRE:
1. Ler esta SKILL antes de propor mudanças
2. Seguir estrutura de pastas
3. Consultar problemas conhecidos
4. Adicionar tipos TypeScript
5. Escrever testes
6. Fazer cleanup de subscriptions
7. Tratar erros do Supabase

### ❌ NUNCA:
1. Remover unique constraints
2. Ignorar RLS policies
3. Esquecer unsubscribe
4. Hardcodear credenciais
5. Alterar schemas sem migration

### 🎯 PRIORIDADES:
- 🔴 Corrigir race condition (ParticipationService)
- 🔴 Validação de senha (EventSecurityService)
- 🔴 Memory leaks (subscriptions)
- 🟡 Performance (N+1 queries)
- 🟡 Testes automatizados

---

**Última atualização**: 04/11/2025  
**Versão**: 2.0.0  
**Repositório**: https://github.com/mesapra2/mezza