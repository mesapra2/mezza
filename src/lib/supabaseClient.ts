// src/lib/supabaseClient.ts
/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ksmnfhenhppasfcikefd.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzbW5maGVuaHBwYXNmY2lrZWZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyNDg1NjcsImV4cCI6MjA3NTgyNDU2N30.RxONSYX5O7Z0pJTDvSTx6G0IFf0eV9R_6x4_EnXm0II';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}

// ✅ Singleton pattern para evitar múltiplas instâncias
const SUPABASE_SINGLETON_KEY = Symbol.for('supabase.client.singleton');

let globalThis: any;
if (typeof window !== 'undefined') {
  globalThis = window;
} else if (typeof global !== 'undefined') {
  globalThis = global;
} else {
  globalThis = {};
}

if (!globalThis[SUPABASE_SINGLETON_KEY]) {
  globalThis[SUPABASE_SINGLETON_KEY] = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'sb-ksmnfhenhppasfcikefd-auth-token',
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
    global: {
      headers: {
        'Content-Type': 'application/json',
      },
      fetch: (url, options = {}) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout para deploy
        
        return fetch(url, {
          ...options,
          signal: controller.signal,
        }).finally(() => clearTimeout(timeoutId));
      },
    },
    db: {
      schema: 'public',
    },
    realtime: {
      params: {
        eventsPerSecond: 5, // Reduzido para produção
      },
    },
  });
}

export const supabase = globalThis[SUPABASE_SINGLETON_KEY];