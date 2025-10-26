// src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ksmnfhenhppasfcikefd.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzbW5maGVuaHBwYXNmY2lrZWZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyNDg1NjcsImV4cCI6MjA3NTgyNDU2N30.RxONSYX5O7Z0pJTDvSTx6G0IFf0eV9R_6x4_EnXm0II';

// ✅ Chave única para garantir singleton global
const SUPABASE_SINGLETON_KEY = '__supabase_client__';

// ✅ Garante que apenas uma instância seja criada mesmo com HMR
if (!globalThis[SUPABASE_SINGLETON_KEY]) {
  console.log('🔧 Criando nova instância do Supabase Client');
  
  globalThis[SUPABASE_SINGLETON_KEY] = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // ✅ Usa storage key única para evitar conflitos
      storageKey: 'mesapra2-auth-token',
    },
  });
} else {
  console.log('♻️ Reutilizando instância existente do Supabase Client');
}

export const supabase = globalThis[SUPABASE_SINGLETON_KEY];
export default supabase;