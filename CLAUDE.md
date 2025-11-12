# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Mesapra2** is a social dining events platform built with React 18 that connects people through event management. The application serves two user types (regular users and restaurant partners) with tiered access (free and premium). The platform is mobile-first and includes real-time chat, event management, and trust scoring systems.

**Tech Stack**: React 18 + Vite, TypeScript/JavaScript, Supabase (BaaS), Tailwind CSS + Shadcn/ui
**Deployment**: Vercel (https://app.mesapra2.com)

## Development Commands

### Build & Development
```bash
npm run dev          # Start dev server on http://localhost:3000
npm run build        # Production build (uses --mode production)
npm run preview      # Preview production build locally
```

### Testing
```bash
npm run test         # Run Vitest tests
npm run test:jest    # Run Jest tests (fallback, uses --passWithNoTests)
```

### Utilities
```bash
npm run treeview     # View directory structure (excludes node_modules, dist, docs, .git)
npm run tree         # Generate estrutura.md with directory tree
```

### Agent (if applicable)
```bash
npm run agent:dev    # Run agent in development with ts-node
npm run agent:start  # Run compiled agent from dist/
```

## Architecture

### Feature-Based Modular Architecture

The codebase follows a feature-based pattern with clear separation of concerns:

```
src/
├── features/
│   ├── shared/          # Cross-cutting components for all users
│   │   ├── components/  # UI components (auth, events, profile, ui)
│   │   ├── pages/       # Shared pages (auth, events, dashboard, chat, profile)
│   │   ├── services/    # Shared business logic
│   │   └── hooks/       # Shared hooks
│   ├── user/            # Regular user-specific features
│   │   ├── pages/       # User dashboard, event creation, settings
│   │   └── services/    # User event service
│   └── partner/         # Restaurant partner-specific features
│       ├── pages/       # Partner dashboard, event management
│       └── components/  # Partner-specific components
├── services/            # Core business logic (TypeScript)
├── contexts/            # React Context providers (Auth, Premium)
├── hooks/               # Custom React hooks
├── config/              # Configuration (features, user types, hashtags)
├── lib/                 # Supabase client & utilities
├── utils/               # Utility functions
└── components/          # Layout & navigation components
```

**Key Principle**: Features are self-contained. Shared functionality lives in `features/shared/`, while user-type-specific code stays in respective feature directories.

### Service Layer (TypeScript)

Core business logic is implemented as TypeScript services with static methods:

- **`EventStatusService.ts`** - Event lifecycle management (60+ states), automatic scheduling, password generation
- **`EventSecurityService.ts`** - Event security (passwords, entry locking)
- **`TrustScoreService.ts`** - User trust scoring algorithm based on participation history
- **`ParticipationService.ts`** - User participation in events
- **`PartnerEventService.ts`** - Partner event management
- **`NotificationService.ts`** / **`PushNotificationService.ts`** - Notification delivery
- **`RatingService.ts`** - Event and user rating system
- **`WaitingListService.ts`** - Event waiting list management
- **`ChatCleanupService.ts`** - Automatic chat cleanup for inactive events
- **`authService.ts`** - Authentication operations (register, login, phone verification)

**Pattern**: Services are stateless, use Supabase client directly, and return typed results.

## State Management

### Context-Based Global State

The app uses React Context API for global state management:

#### AuthContext (`src/contexts/AuthContext.jsx`)
- Provides: `user`, `profile`, `loading`, `login()`, `logout()`, `updateProfile()`, etc.
- Handles session persistence, phone verification, and profile enrichment
- Wraps entire app via `AuthProvider`

#### PremiumContext (`src/contexts/PremiumContext.jsx`)
- Provides: `hasFeature()`, `getLimits()`, `getAvailableFeatures()`, `userType`
- Manages feature gating for free vs. premium users
- Access via `usePremium()` hook

**Usage Pattern**:
```javascript
import { useAuth } from '@/contexts/AuthContext';
import { usePremium } from '@/contexts/PremiumContext';

const { user, profile } = useAuth();
const { hasFeature, getLimits } = usePremium();

if (hasFeature('CREATE_MULTIPLE_EVENTS')) {
  // Premium feature
}
```

## Configuration

### User Types & Premium Features

#### User Types (`src/config/userTypes.js`)
- `USER_FREE` - Regular free user
- `USER_PREMIUM` - Premium regular user
- `PARTNER_FREE` - Restaurant partner (free tier)
- `PARTNER_PREMIUM` - Restaurant partner (premium tier)

**Determination**: Based on `profile.profile_type` (`user` | `partner`) + `profile.is_premium` boolean.

#### Premium Features (`src/config/premiumFeatures.js`)

**Free Tier Limits**:
- **Users**: Max 2 events, 10 participants per event
- **Partners**: Max 5 events, 50 participants per event

**Premium Features**:
- Users: Unlimited events/participants, advanced filters, analytics, custom themes
- Partners: Unlimited events, advanced analytics, custom branding, API access

### Hashtags (`src/config/hashtagsConfig.js`)
- **Premium hashtags** (5): aniversário, confraternização, churrascompiscina, passeiodelancha, cinema
- **Common hashtags** (27): happyhour, café, brunch, almoco, jantar, drinks, etc.

## Special Features & Patterns

### Phone Verification Requirement
All users must verify their phone number after registration. The app includes:
- `RequirePhoneVerification` wrapper component for protected routes
- Automatic sync of phone verification data
- Bypass for legacy users without phone verification

### Event Password System
Events automatically generate unique passwords **1 minute before start time**. Implemented in `EventStatusService.ts`.

### Trust Score Algorithm
Users receive trust scores based on:
- Event attendance history
- Cancellation patterns
- Rating from other users

Calculated in `TrustScoreService.ts`.

### Auto-Cancellation
Events automatically cancel if minimum participants are not met by a threshold time. Handled by `AutoCancelEventService.js` and `EventStatusService.ts`.

### Real-Time Features
Supabase real-time subscriptions configured for:
- Event updates (10 events/second rate limit)
- Chat messages
- Notifications

### Social Media Optimization (OG Images)
Vercel configuration includes bot detection for Facebook, Twitter, LinkedIn, Discord, WhatsApp, etc. When bots access event or restaurant pages, they're rewritten to `/api/og.js` for dynamic Open Graph image generation.

## Testing

### Frameworks
- **Vitest** (primary) - Configured in `vite.config.js` with jsdom environment
- **Jest** (fallback) - Configured in `jest.config.cjs` with ts-jest for TypeScript

### Test File Locations
- `src/services/*.test.ts` - Service unit tests
- `src/features/*/*.test.jsx` - Component tests
- `src/App.test.jsx` - App component tests

### Testing Utilities
- `@testing-library/react` - Component testing
- `@testing-library/jest-dom` - DOM matchers
- `jsdom` - DOM simulation

**Note**: Jest config includes transform ignore patterns for `@supabase/supabase-js` and `axios`.

## Build Configuration

### Vite (`vite.config.js`)
- **Path alias**: `@` → `./src`
- **Manual code splitting** for vendor optimization:
  - `react-vendor`: React, React Router
  - `supabase-vendor`: Supabase
  - `ui-vendor`: Framer Motion, Lucide, date-fns
  - `helmet-vendor`: React Helmet
- **Chunk size warning**: 1000KB
- **Dev server**: Port 3000 with `historyApiFallback` for SPA routing

### TypeScript (`tsconfig.json`)
- **Target**: ES2020
- **Module**: ESNext with bundler resolution
- **Strict mode**: Enabled (full type safety)
- **JSX**: `react-jsx`
- **Path aliases**: Configured for modules

## Styling

### Tailwind CSS + Shadcn/ui
- **Strategy**: Utility-first CSS with Shadcn component library (New York style)
- **Components**: Located in `src/features/shared/components/ui/`
- **Configuration**: `tailwind.config.js` with CSS variables and dark mode support
- **Custom utilities**: Gradient text, animations via `tailwindcss-animate`

**Key UI Components** (Shadcn):
- Button, Dialog, Input, Label, Select, Dropdown Menu, Toast
- Checkbox, Switch (Radix UI primitives)

## Database & Authentication

### Supabase Configuration
- **Client**: `src/lib/supabaseClient.ts`
- **Auth**: Session persistence with auto-token refresh
- **Real-time**: Configured for events, chat, notifications

**Key Tables**:
- `profiles` - User profiles (with `profile_type`, `is_premium`)
- `events` - Event listings
- `participants` - Event participation records
- `partners` - Restaurant partner data
- `chat_messages` - Event chat messages
- `notifications` - In-app notifications

### Authentication Flow
1. Login/Register → `AuthCallbackPage`
2. Phone verification → `PhoneVerificationPage`
3. Redirect to dashboard (user or partner based on `profile_type`)

## Environment Variables

Development and production use separate `.env` files:

**Development** (`.env.development`):
- API URL: `http://localhost:4000`
- Supabase: Development/staging instance

**Production** (`.env.production`):
- API URL: `https://app.mesapra2.com/api`
- Supabase: Production instance

## Deployment

### Vercel
- **Build command**: `npm run build`
- **Output directory**: `dist`
- **URL**: https://app.mesapra2.com
- **Features**: Serverless functions for OG images, automatic deployments from git

### Edge Cases
- Bot detection for social media crawlers (Open Graph rewrites)
- SPA fallback to `index.html` for all routes

## Code Quality

### Linting & Formatting
- **ESLint**: Configured for React (`eslint-config-react-app`, `eslint-plugin-react`)
- **Prettier**: Code formatting (`.prettierrc.json`)
- **TypeScript**: Strict mode with full type checking

### Best Practices
- Use TypeScript for services and complex logic
- Use `@/` path alias for imports
- Memoize context values to prevent unnecessary re-renders
- Handle errors gracefully with toast notifications
- Log errors for debugging (console.error)

## Key Entry Points

1. **`index.html`** → Static HTML entry
2. **`src/Main.jsx`** → React DOM root with providers (Router, Auth, Premium, Helmet, Toaster)
3. **`src/App.jsx`** → Route configuration (public + protected routes)
4. **`src/components/Layout.jsx`** → Shared layout with sidebar navigation

## Event Types

The platform supports three event types:

1. **Particular** - Private/party events created by users
2. **Crusher** - Social events for meeting new people
3. **Restaurant** - Events hosted by restaurant partners

Event type determines available features, participant limits, and UI flow.

## Working with the Codebase

### Adding New Features
1. Determine if it's shared, user-specific, or partner-specific
2. Place code in appropriate `features/` directory
3. Create service in `src/services/` for business logic (TypeScript preferred)
4. Update premium feature gates if needed (`src/config/premiumFeatures.js`)
5. Add tests in corresponding `*.test.ts` or `*.test.jsx` files

### Modifying Event Logic
- Event status management: `EventStatusService.ts`
- Participation: `ParticipationService.ts`
- Security: `EventSecurityService.ts`
- Auto-cancellation: `AutoCancelEventService.js`

### UI Components
- Prefer Shadcn components from `src/features/shared/components/ui/`
- Follow Tailwind utility-first approach
- Use Radix UI primitives for accessibility

### State Management
- Use existing contexts (`AuthContext`, `PremiumContext`) for global state
- Avoid prop drilling - lift state to context when needed
- Use custom hooks for complex component logic

### Testing New Code
- Run `npm run test` (Vitest) for fast feedback
- Ensure tests pass before committing
- Use `@testing-library/react` for component tests
- Mock Supabase client when needed

## Troubleshooting

### Common Issues

**Build Failures**:
- Check TypeScript errors: `tsc --noEmit`
- Clear cache: Delete `node_modules/.vite` and `dist/`

**Test Failures**:
- Ensure jsdom environment is set
- Check for missing mocks (Supabase, external APIs)
- Run tests individually: `npm run test -- <filename>`

**Authentication Issues**:
- Verify Supabase client initialization in `src/lib/supabaseClient.ts`
- Check environment variables (`.env.development` or `.env.production`)
- Ensure phone verification is bypassed for legacy users

**Premium Feature Bugs**:
- Verify user type determination in `src/config/userTypes.js`
- Check `PremiumContext` logic
- Ensure `profile.is_premium` is correctly set in database
