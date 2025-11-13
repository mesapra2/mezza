# 🧪 Guia de Teste - Sistema de Verificação de Identidade

## ✅ Sistema Implementado e Configurado!

### 🔧 Configuração Necessária

#### 1. **Google Vision API**
Adicione ao seu `.env.local`:
```bash
# Opção 1: Arquivo de credenciais (recomendado)
GOOGLE_VISION_KEY_PATH=/caminho/para/sua/service-account-key.json

# Opção 2: Variáveis individuais
GOOGLE_VISION_PROJECT_ID=seu-project-id
GOOGLE_VISION_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nSUA_KEY_AQUI\n-----END PRIVATE KEY-----"
GOOGLE_VISION_CLIENT_EMAIL=seu-email@projeto.iam.gserviceaccount.com
```

### 🧪 Como Testar

#### **Passo 1: Página de Teste**
Acesse: `http://localhost:3000/test-verification`
- ✅ Testa detecção de dispositivo
- ✅ Valida funções de CPF
- ✅ Verifica APIs disponíveis
- ✅ Gera QR Code de teste

#### **Passo 2: Fluxo Desktop**
1. Faça login na aplicação
2. Vá para **Configurações** → **Verificação de Identidade**
3. Sistema deve detectar desktop e solicitar CPF
4. Insira um CPF válido (ex: 12345678909)
5. QR Code deve ser gerado

#### **Passo 3: Fluxo Mobile**
1. **Opção A:** Escaneie o QR Code com seu celular
2. **Opção B:** Acesse diretamente no celular: `http://localhost:3000/verify-mobile?userId=TEST&sessionId=123`
3. Siga o fluxo: CPF → Foto Frente → Foto Verso → Selfie
4. Sistema processará automaticamente

### 📁 Arquivos Criados

#### **Componentes:**
- `src/components/DocumentVerificationNew.jsx` - Novo fluxo desktop
- `src/features/shared/pages/MobileVerificationPage.jsx` - Página mobile atualizada
- `src/components/TestVerificationFlow.jsx` - Página de testes

#### **APIs:**
- `api/verify-cpf-document.js` - Verificação automática com Google Vision
- `api/upload-verification-document.js` - Upload seguro dos documentos

#### **Configuração:**
- Rota `/verify-mobile` configurada
- Rota `/test-verification` para testes
- UserSettings atualizado para usar novo componente

### 🔍 Como Funciona a Verificação

1. **Desktop detectado:**
   - Solicita CPF
   - Gera QR Code único
   - Não permite upload de arquivos do HD

2. **Mobile detectado:**
   - Coleta CPF
   - Ativa câmera para fotos em tempo real
   - Sequência: Documento frente → verso → selfie

3. **Verificação automática:**
   - Google Vision extrai CPF do documento
   - Compara com CPF informado
   - ✅ **Se confere:** Usuário aprovado automaticamente
   - ❌ **Se não confere:** Solicita refazer processo

### 🐛 Debug e Logs

#### **Console do Navegador:**
- Logs de detecção de dispositivo
- Status de upload das fotos
- Resultados da verificação

#### **Server Logs:**
- Logs do Google Vision OCR
- Comparação de CPFs
- Status das operações no banco

#### **Banco de Dados:**
- Tabela `user_verifications` - Status das verificações
- Campo `profiles.is_verified` - Status do usuário
- Storage `verification-documents` - Arquivos enviados

### 🚨 Troubleshooting

#### **QR Code não aparece:**
- Verifique import do qrcode no DocumentVerificationNew.jsx
- Confirme que a biblioteca foi instalada

#### **Erro 406 nas APIs:**
- Execute o SQL de fix das políticas RLS
- Verifique autenticação do usuário

#### **Google Vision falha:**
- Configure credenciais do Google Cloud
- Verifique se a Vision API está ativa
- Confirme variáveis de ambiente

#### **Mobile não funciona:**
- Verifique permissões de câmera
- Teste em HTTPS (pode ser necessário para câmera)
- Confirme que getUserMedia é suportado

### 📱 URLs de Teste

- **Desktop:** `http://localhost:3000/settings` (logado)
- **Mobile:** `http://localhost:3000/verify-mobile?userId=test123&sessionId=abc`
- **Testes:** `http://localhost:3000/test-verification`

### ✨ Próximos Passos

1. **Configure Google Vision** com suas credenciais
2. **Teste o fluxo completo** desktop → mobile
3. **Valide upload** e verificação de documentos
4. **Remova rota de teste** quando em produção
5. **Customize mensagens** e interface conforme necessário

---
**🎉 Sistema pronto para uso! Qualquer dúvida, verifique os logs do console/server.**