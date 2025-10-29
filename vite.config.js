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
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'supabase-vendor': ['@supabase/supabase-js'],
            'ui-vendor': ['framer-motion', 'lucide-react', 'date-fns'],
            'helmet-vendor': ['react-helmet-async'],
          },
        },
      },
      chunkSizeWarningLimit: 1000,
      minify: 'esbuild',
      esbuild: {
        drop: isDev ? [] : ['console', 'debugger'],
      },
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
    },
    
    preview: {
      port: 3000,
      historyApiFallback: true, // ⭐ Para 'npm run preview'
    },
  };
});