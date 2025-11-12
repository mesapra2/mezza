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
    plugins: [
      react({
        // ✅ Habilitar JSX em todos os arquivos relevantes
        include: "**/*.{jsx,js,tsx,ts}",
        // ✅ Configuração para JSX automático
        jsxRuntime: 'automatic'
      })
    ],
    
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
      
      // ✅ Resource hints para performance
      assetsInlineLimit: 4096, // Inline assets menores que 4KB
      
      // ✅ Rollup options para otimização
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
      
      // ✅ CORREÇÃO: MIME types e headers otimizados
      middlewareMode: false,
      fs: {
        strict: false,
      },
      
      // ✅ Configuração de middleware personalizado (apenas para dev)
      ...(process.env.NODE_ENV !== 'production' && {
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            // ✅ MIME types corretos para módulos
            if (req.url?.endsWith('.jsx') || req.url?.endsWith('.tsx')) {
              res.setHeader('Content-Type', 'application/javascript');
            }
            if (req.url?.endsWith('.ts') && !req.url.endsWith('.tsx')) {
              res.setHeader('Content-Type', 'application/javascript');
            }
            
            // ✅ Headers de segurança e performance
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('X-Frame-Options', 'DENY');
            res.setHeader('X-XSS-Protection', '1; mode=block');
            res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
            
            next();
          });
        }
      }),
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