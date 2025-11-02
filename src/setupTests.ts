/* eslint-disable @typescript-eslint/no-explicit-any */
import '@testing-library/jest-dom';

// Mock do import.meta.env para compatibilidade com Vite
Object.defineProperty(globalThis, 'import.meta', {
  value: {
    env: {
      VITE_SUPABASE_URL: 'https://ksmnfhenhppasfcikefd.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
      VITE_API_URL: 'http://localhost:4000',
      MODE: 'test',
      DEV: false,
      PROD: false,
      SSR: false,
    },
  },
  writable: true,
  configurable: true,
});

// Mock do Supabase Client
jest.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      signIn: jest.fn(),
      signOut: jest.fn(),
      signUp: jest.fn(),
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      onAuthStateChange: jest.fn(() => ({
        data: {
          subscription: {
            unsubscribe: jest.fn(),
          },
        },
      })),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      like: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      contains: jest.fn().mockReturnThis(),
      containedBy: jest.fn().mockReturnThis(),
      match: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      filter: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn().mockResolvedValue({ data: null, error: null }),
        download: jest.fn().mockResolvedValue({ data: null, error: null }),
        remove: jest.fn().mockResolvedValue({ data: null, error: null }),
        list: jest.fn().mockResolvedValue({ data: [], error: null }),
        getPublicUrl: jest.fn().mockReturnValue({ 
          data: { publicUrl: 'http://example.com/file' } 
        }),
      })),
    },
  },
}));

// Mock do authService
jest.mock('@/services/authService', () => ({
  default: {
    login: jest.fn().mockResolvedValue({ success: true, data: {} }),
    register: jest.fn().mockResolvedValue({ success: true, data: {} }),
    logout: jest.fn().mockResolvedValue({ success: true }),
    verifyPhone: jest.fn().mockResolvedValue({ success: true }),
    sendVerificationCode: jest.fn().mockResolvedValue({ success: true }),
    resetPassword: jest.fn().mockResolvedValue({ success: true }),
    changePassword: jest.fn().mockResolvedValue({ success: true }),
    getCurrentUser: jest.fn().mockResolvedValue(null),
  },
}));

// Mock do React Router
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
  useLocation: jest.fn(() => ({ 
    pathname: '/', 
    search: '', 
    hash: '', 
    state: null 
  })),
  useParams: jest.fn(() => ({})),
}));