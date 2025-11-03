/* eslint-env node */

// Configuração de variáveis de ambiente para testes
process.env.VITE_SUPABASE_URL = 'https://ksmnfhenhppasfcikefd.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzbW5maGVuaHBwYXNmY2lrZWZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyNDg1NjcsImV4cCI6MjA3NTgyNDU2N30.RxONSYX5O7Z0pJTDvSTx6G0IFf0eV9R_6x4_EnXm0II';
process.env.VITE_API_URL = 'http://localhost:4000';

// Mock do import.meta.env para Vite
global.importMetaEnv = {
  VITE_SUPABASE_URL: 'https://ksmnfhenhppasfcikefd.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'your-test-anon-key',
  VITE_API_URL: 'http://localhost:4000',
};

// Se você usa import.meta.env, adicione este mock
if (typeof global.import === 'undefined') {
  global.import = {};
}

global.import.meta = {
  env: global.importMetaEnv,
};