// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import App from '@/App.jsx';
import '@/index.css';
import { Toaster } from '@/features/shared/components/ui/toaster.jsx';
import { AuthProvider } from '@/contexts/AuthContext.jsx';
import { PremiumProvider } from '@/contexts/PremiumContext.jsx';

console.log('🚀 Iniciando aplicação Mesapra2...');

// Mostra variáveis de ambiente para debug
console.log('🔍 Ambiente:', import.meta.env.MODE);
console.log('📊 Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('📊 Site URL:', import.meta.env.VITE_SITE_URL);

window.addEventListener('error', (event) => {
  console.error('❌ Erro global:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('❌ Promise rejeitada:', event.reason);
});

try {
  const rootElement = document.getElementById('root');
  
  if (!rootElement) {
    throw new Error('Elemento #root não encontrado no DOM');
  }

  console.log('✅ Elemento root encontrado');

  // ✅ REMOVIDO React.StrictMode para evitar dupla montagem
  ReactDOM.createRoot(rootElement).render(
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <HelmetProvider>
        <AuthProvider>
          <PremiumProvider>
            <App />
          </PremiumProvider>
        </AuthProvider>
        <Toaster />
      </HelmetProvider>
    </BrowserRouter>
  );

  console.log('✅ Aplicação renderizada');
} catch (error) {
  console.error('❌ Erro fatal:', error);
  
  document.body.innerHTML = `
    <div style="
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: #0a0a0a;
      color: white;
      font-family: system-ui;
      padding: 20px;
      text-align: center;
    ">
      <div style="max-width: 600px;">
        <h1 style="color: #ef4444; margin-bottom: 20px;">❌ Erro ao carregar</h1>
        <p style="color: #9ca3af; margin-bottom: 20px;">${error.message}</p>
        <button 
          onclick="window.location.reload()" 
          style="
            padding: 12px 24px;
            background: #8b5cf6;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
          "
        >
          🔄 Recarregar
        </button>
      </div>
    </div>
  `;
}