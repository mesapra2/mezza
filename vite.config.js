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
  
  // Force development mode for React
  process.env.NODE_ENV = isDev ? 'development' : 'production';
  const __dirname = path.dirname(fileURLToPath(import.meta.url)); // Substitui __dirname

  return {
    plugins: [
      react({
        // ✅ Habilitar JSX em todos os arquivos relevantes
        include: "**/*.{jsx,js,tsx,ts}",
        // ✅ Configuração para JSX automático
        jsxRuntime: 'automatic'
      })
    ],
    
    define: {
      // Force React development mode
      'process.env.NODE_ENV': JSON.stringify(isDev ? 'development' : 'production'),
      // Fix React DevTools
      __DEV__: isDev,
    },
    
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    
    build: {
      sourcemap: true,
      chunkSizeWarningLimit: 1000,
      minify: 'esbuild',
      esbuild: {
        drop: isDev ? [] : ['console', 'debugger'],
        pure: isDev ? [] : ['console.log', 'console.info', 'console.warn'],
      },
      cssCodeSplit: true,
      cssMinify: true,
      assetsInlineLimit: 4096,
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
          assetFileNames: (assetInfo) => {
            if (assetInfo.name?.endsWith('.css')) {
              return 'assets/css/[name]-[hash].[ext]';
            }
            return 'assets/[ext]/[name]-[hash].[ext]';
          },
        }
      }
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
      
      // ✅ Proxy para APIs serverless durante desenvolvimento
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          rewrite: (path) => path
        },
      },
      
      // ✅ CORREÇÃO: MIME types e headers otimizados
      middlewareMode: false,
      fs: {
        strict: false,
      },
      
      // ✅ MIME types configuração universal (dev + prod)
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          // ✅ CORREÇÃO CRÍTICA: MIME types corretos
          if (req.url?.endsWith('.jsx')) {
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
            res.setHeader('X-Content-Type-Options', 'nosniff');
          }
          if (req.url?.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
            res.setHeader('X-Content-Type-Options', 'nosniff');
          }
          if (req.url?.endsWith('.tsx') || req.url?.endsWith('.ts')) {
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
          }
          
          // ✅ Headers de segurança
          res.setHeader('X-Frame-Options', 'SAMEORIGIN'); // Permitir OAuth iframes
          res.setHeader('X-XSS-Protection', '1; mode=block');
          res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
          
          next();
        });
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