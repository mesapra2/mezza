# 🚀 Otimização Vercel - Redução de Funções Serverless

## ❌ **Problema Original:**
```
Error: No more than 12 Serverless Functions can be added to a Deployment on the Hobby plan.
```

## 📊 **Situação Atual:**
- **Limite Hobby**: 12 funções serverless
- **APIs atuais**: 13+ arquivos na pasta `/api/`
- **Solução**: Consolidar APIs relacionadas

## ✅ **Estratégia de Consolidação:**

### **1. SMS APIs → `/api/sms.js`**
Consolidar:
- `send-verification-sms.mjs` 
- `verify-phone-code.mjs`
- `check-sms-status.mjs`
- `sms-webhook.mjs`

**Uso:**
```js
// Enviar SMS
fetch('/api/sms', {
  method: 'POST',
  body: JSON.stringify({
    action: 'send',
    userId: 'user123',
    phone: '61984656910'
  })
});

// Verificar status
fetch('/api/sms', {
  method: 'POST', 
  body: JSON.stringify({
    action: 'status',
    messageSid: 'SM123...'
  })
});
```

### **2. Verification APIs → `/api/verification.js`**
Consolidar:
- `verify-cpf-document.js`
- `upload-verification-document.js` 
- `submit-verification.js`
- `submit-mobile-verification.js`

**Uso:**
```js
// Verificar documento
fetch('/api/verification', {
  method: 'POST',
  body: JSON.stringify({
    action: 'document',
    documentData: {...}
  })
});
```

### **3. Payment APIs → `/api/payment.js`**
Consolidar:
- `create-openpix-charge.js`
- `openpix-webhook.js`

### **4. Testing APIs → `/api/testing.js`**
Consolidar:
- `test-ocr.js`
- `test-vision.js`
- `test-og-api.js`

## 📱 **Como Atualizar Frontend:**

### **Antes:**
```js
await fetch('/api/send-verification-sms', {...});
await fetch('/api/check-sms-status', {...});
```

### **Depois:**
```js
await fetch('/api/sms', {
  body: JSON.stringify({ action: 'send', ...data })
});
await fetch('/api/sms', {
  body: JSON.stringify({ action: 'status', ...data })
});
```

## 🎯 **Resultado Esperado:**

### **Antes:** 13+ funções
- send-verification-sms.mjs
- verify-phone-code.mjs  
- check-sms-status.mjs
- sms-webhook.mjs
- verify-cpf-document.js
- upload-verification-document.js
- submit-verification.js
- submit-mobile-verification.js
- create-openpix-charge.js
- openpix-webhook.js
- test-ocr.js
- test-vision.js
- test-og-api.js

### **Depois:** 4 funções ✅
- `/api/sms.js`
- `/api/verification.js` 
- `/api/payment.js`
- `/api/testing.js`

## 🔄 **Migração Step-by-Step:**

1. **Criar APIs consolidadas** ✅
2. **Testar localmente** 
3. **Atualizar frontend** para usar novas APIs
4. **Deploy e teste**
5. **Remover APIs antigas**

## 💡 **Benefícios Adicionais:**
- ✅ **Menos cold starts**
- ✅ **Melhor organização**
- ✅ **Easier maintenance** 
- ✅ **Consistent error handling**
- ✅ **Shared utilities**

---

**🎉 Com essa otimização, o deploy no Vercel Hobby vai funcionar perfeitamente!**