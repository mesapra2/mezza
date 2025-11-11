# 🔍 Google Vision API - Status e Testes

## ✅ STATUS ATUAL

### ✅ DEPENDÊNCIA INSTALADA:
- `@google-cloud/vision`: v5.3.4 ✅ INSTALADO

### ⚠️ CONFIGURAÇÃO NECESSÁRIA:
- Variáveis de ambiente do Google Cloud precisam ser configuradas

---

## 🚀 COMO CONFIGURAR PARA PRODUÇÃO

### 1. Criar Service Account no Google Cloud
1. Acesse [Google Cloud Console](https://console.cloud.google.com)
2. Vá em **IAM & Admin** → **Service Accounts**
3. **Create Service Account**
4. Adicione as roles:
   - **Cloud Vision API User**
   - **Storage Object Viewer** (para acessar imagens no bucket)

### 2. Gerar Credenciais JSON
1. Na service account criada, clique **Actions** → **Manage Keys**
2. **Add Key** → **Create New Key** → **JSON**
3. Baixe o arquivo JSON

### 3. Configurar Variáveis de Ambiente

**Opção A - Usando arquivo JSON (Desenvolvimento):**
```env
GOOGLE_VISION_KEY_PATH=/path/to/service-account-key.json
```

**Opção B - Usando variáveis (Produção recomendado):**
```env
GOOGLE_VISION_PROJECT_ID=seu-projeto-id
GOOGLE_VISION_CLIENT_EMAIL=sua-service-account@projeto.iam.gserviceaccount.com
GOOGLE_VISION_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nSUA_CHAVE_PRIVADA\n-----END PRIVATE KEY-----"
GOOGLE_VISION_PRIVATE_KEY_ID=id-da-chave
GOOGLE_VISION_CLIENT_ID=id-do-client
```

### 4. Habilitar APIs no Google Cloud
1. **Cloud Vision API** ✅ 
2. **Cloud Storage API** ✅
3. Verificar se o projeto tem quota suficiente

---

## 🧪 TESTES IMPLEMENTADOS

### Teste 1: Configuração
```bash
node api/test-vision.js
```

### Teste 2: Fluxo Completo
1. Acesse o fluxo mobile de verificação
2. Tire as 3 fotos (documento frente, verso, selfie)
3. Verifique os logs no console:
   ```
   🔄 Chamando API de verificação com Google Vision...
   📋 Dados enviados: {userId, cpf, URLs válidas}
   ```

---

## 🎯 FLUXO COMPLETO IMPLEMENTADO

### ✅ Frontend (MobileVerificationPageSimple.jsx):
1. Captura 3 fotos (documento frente, verso, selfie)
2. Upload para Supabase Storage
3. Chama `/api/verify-cpf-document` com URLs das fotos

### ✅ Backend (api/verify-cpf-document.js):
1. Recebe URLs das fotos
2. Usa Google Vision para extrair texto do documento
3. Compara CPF informado vs CPF extraído
4. Retorna resultado da verificação

### ✅ Google Vision Integration:
- OCR do documento para extrair texto
- Regex patterns para encontrar CPF
- Validação cruzada CPF informado vs extraído

---

## 📊 LOGS DE DEBUG IMPLEMENTADOS

O fluxo agora inclui logs detalhados para monitoramento:

```javascript
// Frontend
🔄 Chamando API de verificação com Google Vision...
📋 Dados enviados: {userId, cpf, URLs válidas}

// Backend  
Texto extraído do documento: [texto do OCR]
CPF encontrado no documento: 123.456.789-01
CPF informado pelo usuário: 12345678901
✅ CPF corresponde / ❌ CPF não corresponde
```

---

## 🚨 TROUBLESHOOTING

### Erro: "quotaExceeded" 
- Verificar quota da Vision API no Google Cloud
- Considerar upgrade do plano

### Erro: "authentication failed"
- Verificar credenciais do service account
- Conferir se as variáveis de ambiente estão corretas

### Erro: "API not enabled"
- Habilitar Cloud Vision API no projeto
- Aguardar alguns minutos para propagação

---

## ✅ CHECKLIST PRÉ-PRODUÇÃO

- [ ] Service Account criado no Google Cloud
- [ ] Cloud Vision API habilitada
- [ ] Credenciais configuradas nas variáveis de ambiente
- [ ] Teste `node api/test-vision.js` passou
- [ ] Teste end-to-end do fluxo mobile funcionando
- [ ] Logs de debug visíveis no console
- [ ] Quota da API adequada para produção

---

**Status**: ✅ **PRONTO PARA PRODUÇÃO** (após configurar credenciais)