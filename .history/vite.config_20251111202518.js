/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import path from 'path';

export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';
  const __dirname = path.dirname(fileURLToPath(import.meta.url));

  return {
    plugins: [react()],
    
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    
    build: {
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'supabase-vendor': ['@supabase/supabase-js'],
            'ui-vendor': ['framer-motion', 'lucide-react', 'date-fns'],
            'helmet-vendor': ['react-helmet-async'],
          },
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
        },
      },
      chunkSizeWarningLimit: 1000,
      minify: 'esbuild',
      esbuild: {
        drop: isDev ? [] : ['console', 'debugger'],
      },
      cssCodeSplit: true,
      cssMinify: true,
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

    // ✅ CORREÇÃO: Incluir vídeos e outros assets
    assetsInclude: ['**/*.mp4', '**/*.webm', '**/*.ogg', '**/*.mov'],
    
    // ✅ Configuração do servidor de desenvolvimento
    server: {
      port: 3000,
      // ✅ Middleware para fallback de SPA
      proxy: {},
      fs: {
        strict: false,
      },
      // ✅ CRÍTICO: Headers corretos para módulos JS
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    },
    
    // ✅ Configuração para preview (npm run preview)
    preview: {
      port: 3000,
    },

    // ✅ Configuração do Vitest
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.js',
    },
  };
});