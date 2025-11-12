/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import path from 'path';
//import Layout from '@/components/Layout';
//import EventsPage from '@/features/shared/pages/EventsPage';
//import { useToast } from '@/features/shared/components/ui/use-toast';

export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';
  const __dirname = path.dirname(fileURLToPath(import.meta.url)); // Substitui __dirname

  return {
    plugins: [react()],
    
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    
    build: {
      sourcemap: true, // ✅ Habilitar source maps para produção
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'supabase-vendor': ['@supabase/supabase-js'],
            'ui-vendor': ['framer-motion', 'lucide-react', 'date-fns'],
            'helmet-vendor': ['react-helmet-async'],
          },
          // ✅ Configurar nomes de arquivos para melhor debug
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
        },
      },
      chunkSizeWarningLimit: 1000,
      minify: 'esbuild',
      esbuild: {
        drop: isDev ? [] : ['console', 'debugger'],
        // Remove todos os console.* em produção
        pure: isDev ? [] : ['console.log', 'console.info', 'console.warn'],
      },
      // ✅ CSS optimization to prevent render blocking
      cssCodeSplit: true, // Split CSS into separate chunks
      cssMinify: true, // Minify CSS
    },
    
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@supabase/supabase-js',
        'framer-motion',
        'lucide-react',
        'date-fns',
      ],
    },
    
    // ✅ CORREÇÃO: Resolver erro 404 ao atualizar página (F5)
    // Faz fallback para index.html em todas as rotas (SPA routing)
    server: {
      port: 3000,
      historyApiFallback: true, // ⭐ CRÍTICO para React Router
      // ✅ Fix MIME type issues
      headers: {
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://app.mesapra2.com https://*.supabase.co;",
      },
      middlewareMode: false,
      fs: {
        strict: false,
      },
    },
    
    preview: {
      port: 3000,
      historyApiFallback: true, // ⭐ Para 'npm run preview'
    },

    // --- ADIÇÃO PARA O VITEST ---
    test: {
      globals: true, // Permite usar 'test', 'expect', etc. sem importar
      environment: 'jsdom', // Simula um navegador
      setupFiles: './src/test/setup.js', // Arquivo de setup (próximo passo)
    },
    // --- FIM DA ADIÇÃO ---
  };
});