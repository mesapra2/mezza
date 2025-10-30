📋 Guia de Configuração - Fluxo de Autenticação de Partners
🎯 Visão Geral do Novo Fluxo
Este documento descreve como implementar o fluxo completo de autenticação de Partners com confirmação de email e aprovação manual por admin.
Fluxo Completo:

✅ Partner se cadastra informando dados pessoais e do restaurante (2 etapas)
✅ Sistema cria conta no Supabase Auth e envia email de confirmação
✅ Partner recebe email e clica no link de confirmação
✅ Após confirmar, pode fazer login com email e senha
✅ Partner pode editar seu perfil, MAS fica invisível no feed público
✅ Admin aprova manualmente em /admin após conferir dados
✅ Admin entra em contato via WhatsApp para verificação
✅ Após aprovação, partner aparece no feed público
┌─────────────────────────────────────────────────┐
│  1. PARTNER SE CADASTRA                         │
│     - Preenche dados pessoais                   │
│     - Preenche dados do restaurante             │
│     - Sistema cria conta                        │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│  2. EMAIL DE CONFIRMAÇÃO                        │
│     - Partner recebe email                      │
│     - Clica no link                             │
│     - Email é confirmado                        │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│  3. PARTNER FAZ LOGIN                           │
│     - Usa email e senha                         │
│     - Acessa dashboard                          │
│     - Pode editar perfil                        │
│     - MAS: Invisível no feed público            │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│  4. ADMIN RECEBE NOTIFICAÇÃO                    │
│     - Badge vermelho na aba "Aprovações"        │
│     - Vê dados completos do partner             │
│     - CNPJ, telefone, endereço, etc             │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│  5. ADMIN VERIFICA DADOS                        │
│     - Confere CNPJ na Receita                   │
│     - Clica no botão WhatsApp                   │
│     - Entra em contato                          │
│     - Confirma informações                      │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│  6. ADMIN APROVA                                │
│     - Clica em "Aprovar"                        │
│     - Partner vira is_active: true              │
│     - Partner aparece no feed público           │
│     - Todos podem ver o restaurante             │
└─────────────────────────────────────────────────┘
                      ↓
                  ✅ SUCESSO!
                  🚀 Implementação em 3 Etapas
ETAPA 1: Front-End (React)

Substitua PartnerRegisterPage.jsx pelo arquivo corrigido
Adicione AuthCallbackPage.jsx em /src/features/shared/pages/
Adicione rota /auth/callback no seu router
(Opcional) Atualize LoginPage.jsx usando o exemplo

Tempo estimado: 15 minutos

ETAPA 2: Supabase

Acesse o Supabase Dashboard
Authentication → Email: Habilite "Confirm email"
URL Configuration: Adicione callback URLs
SQL Editor: Execute políticas RLS (veja GUIA_CONFIGURACAO.md)

Tempo estimado: 10 minutos

ETAPA 3: Painel Admin

Abra main.js do admin
Cole o conteúdo de admin-approvals-module.js no FINAL
Abra o HTML do admin
Adicione o botão da aba (veja GUIA_IMPLEMENTACAO_ADMIN.md)
Adicione o painel completo (copie de admin-approvals-html.html)

Tempo estimado: 20 minutos

✅ Checklist de Implementação
Front-End:

 PartnerRegisterPage substituído
 AuthCallbackPage adicionado
 Rota /auth/callback configurada
 (Opcional) LoginPage atualizado

Supabase:

 Email confirmation habilitado
 Redirect URLs adicionadas
 Políticas RLS executadas
 Email template configurado

Admin:

 JavaScript adicionado ao main.js
 Botão da aba adicionado
 Painel HTML adicionado
 CSS adicionado

Testes:

 Cadastro de partner funciona
 Email de confirmação chega
 Login após confirmação funciona
 Partner não aparece no feed
 Admin vê partner pendente
 Aprovação funciona
 Partner aparece no feed após aprovação


📊 Recursos Implementados
✨ Para Partners:

✅ Cadastro em 2 etapas
✅ Confirmação de email obrigatória
✅ Login seguro após confirmação
✅ Dashboard para editar perfil
✅ Feedback claro sobre status

✨ Para Admins:

✅ Aba "Aprovações" dedicada
✅ Lista de partners pendentes
✅ Estatísticas em tempo real
✅ Busca inteligente
✅ Links diretos para WhatsApp/Email
✅ Botões de Aprovar/Rejeitar
✅ Notificações de pendências
✅ Auto-reload a cada 2 minutos

✨ Segurança:

✅ Email verificado obrigatório
✅ Aprovação manual por humano
✅ CNPJ validado
✅ Contato via WhatsApp
✅ Partners inativos invisíveis
✅ RLS configurado


🎨 Preview Visual
Abra o arquivo PREVIEW_INTERFACE.html no seu navegador para ver exatamente como ficará a interface de aprovações!
O preview mostra:

Estatísticas coloridas
Cards de partners pendentes
Botões de ação
Links para WhatsApp
Layout responsivo

🎯 Fluxo Completo Agora:
Cenário 1: Partner Novo (Email NÃO confirmado)
1. Partner tenta fazer login
   ↓
2. Supabase retorna erro: "Email not confirmed"
   ↓
3. LoginPage detecta o erro
   ↓
4. Mostra mensagem: "📧 Email não confirmado"
   ↓
5. Aparece botão: "Reenviar email de confirmação"
   ↓
6. Partner clica no botão
   ↓
7. Novo email é enviado
   ↓
8. Partner clica no link do email
   ↓
9. Redireciona para: /auth/callback ✅
   ↓
10. AuthCallbackPage processa
   ↓
11. Email confirmado!
   ↓
12. Partner pode fazer login normalmente
Cenário 2: Partner com Email Confirmado
1. Partner faz login
   ↓
2. Login bem-sucedido
   ↓
3. Redireciona para /dashboard (ou /partner/dashboard)
   ↓
4. Partner pode usar o sistema
   ↓
5. MAS ainda NÃO aparece no feed público (is_active = false)
   ↓
6. Admin vê na aba "Aprovações"
   ↓
7. Admin aprova
   ↓
8. Partner vira is_active = true
   ↓
9. Aparece no feed público ✅

📦 Arquivos para Substituir
1. App.jsx

Localização: /src/App.jsx
Mudança: Adicionada rota /auth/callback na linha 137
View App.jsx

2. LoginPage.jsx

Localização: /src/features/shared/pages/LoginPage.jsx
Mudanças:

Importação do useToast e supabase
Função handleResendConfirmation
Estado showResendButton
Tratamento de erro melhorado
Botão de reenvio com animação


View LoginPage.jsx


✅ Checklist Final
Após substituir os arquivos:

 App.jsx substituído
 LoginPage.jsx substituído
 Rota /auth/callback funciona (teste abrindo a URL)
 Callbacks no Supabase configurados ✅ (você já tem!)
 Aba "Aprovações" no admin ✅ (você já tem!)
 AuthCallbackPage existe em /src/features/auth/pages/ ✅


🧪 Como Testar
Teste 1: Email Não Confirmado
1. Cadastre um novo partner
2. NÃO confirme o email ainda
3. Tente fazer login
4. Deve mostrar: "Email não confirmado"
5. Deve aparecer: Botão "Reenviar email"
6. Clique no botão
7. Verifique se chegou novo email
Teste 2: Confirmação de Email
1. Abra o email de confirmação
2. Clique no link
3. Deve ir para /auth/callback
4. Deve processar e redirecionar
5. Deve mostrar "Email confirmado!"
6. Faça login normalmente
Teste 3: Aprovação no Admin
1. Faça login no admin
2. Vá na aba "Aprovações"
3. Deve aparecer o partner cadastrado
4. Clique em "Aprovar"
5. Partner deve aparecer no feed público

🔍 Diferenças Visuais
ANTES (LoginPage antiga):
❌ Erro genérico: "Erro ao fazer login"
❌ Sem opção de reenviar email
❌ Usuário fica perdido
DEPOIS (LoginPage nova):
✅ Erro específico: "📧 Email não confirmado"
✅ Botão: "Reenviar email de confirmação"
✅ Toasts coloridos e claros
✅ Animação suave do botão
✅ Feedback visual imediato

💡 Dicas Importantes

Toast Component: Certifique-se que você tem o componente <Toaster /> no seu App ou Layout principal para os toasts aparecerem.
Import do Supabase: A LoginPage agora importa diretamente o supabase para a função de reenvio:

jsx   import { supabase } from '@/lib/supabaseClient';

Framer Motion: O botão de reenvio usa motion.div para animação suave. Você já tem o framer-motion instalado.
useToast Hook: Você já usa isso em outros lugares, mas certifique-se que está configurado corretamente.


⚠️ IMPORTANTE
NÃO remova a importação do AuthCallbackPage do seu App.jsx atual:
jsximport AuthCallbackPage from '@/features/auth/pages/AuthCallbackPage';
O caminho que você tem (@/features/auth/pages/) está correto e deve ser mantido.

🎯 Pronto para Usar?
SIM! Depois dessas 2 substituições:
✅ PODE CADASTRAR UM PARTNER AGORA
O fluxo completo vai funcionar:

Cadastro → Email enviado ✅
Confirmação → Processa corretamente ✅
Login → Detecta email não confirmado ✅
Reenvio → Funciona ✅
Admin → Vê na aba Aprovações ✅
Aprovação → Partner fica público ✅


1. Partner preenche formulário em /partner/register
   ↓
2. Front-end chama supabase.rpc('create_partner_complete', {...})
   ↓
3. Função SQL cria:
   - Usuário em auth.users (com senha)
   - Profile em profiles (como partner)
   - Partner em partners (aguardando aprovação)
   ↓
4. Front-end faz login automático
   ↓
5. Redireciona para /partner/dashboard
   ↓
6. Partner pode navegar no sistema ✅
   ↓
7. Admin aprova partner (is_active = true)
   ↓
8. Trigger sincroniza profile automaticamente
   ↓
9. Partner fica visível na lista pública ✅