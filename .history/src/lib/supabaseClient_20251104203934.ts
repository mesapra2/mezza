// src/lib/supabaseClient.ts
/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ksmnfhenhppasfcikefd.supabase.co';
//                                                                    ↑ ADICIONADO O 'N' AQUI
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzbWZmaGVuaHBwYXNmY2lrZWZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyNDg1NjcsImV4cCI6MjA3NTgyNDU2N30.RxONSYX5O7Z0pJTDvSTx6G0IFf0eV9R_6x4_EnXm0II';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  // ✅ Removido o header 'Accept' fixo que causava erro 406
  global: {
    headers: {
      'Content-Type': 'application/json',
    },
  },
  db: {
    schema: 'public',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});