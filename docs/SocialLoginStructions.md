# 🍎📘 Login Social: Apple + Facebook + Google

## 📦 Arquivos Criados

1. **SocialLoginButtons.jsx** - Componente reutilizável com os 3 botões
2. **LoginPage.jsx** - Atualizado com botões sociais
3. **RegisterPage.jsx** - Atualizado com botões sociais
4. **AuthContext_ADD_FUNCTIONS.js** - Funções para adicionar no AuthContext

---

## 🚀 Passo a Passo de Instalação

### **1. Adicionar Funções no AuthContext**

Abra `src/contexts/AuthContext.jsx` e adicione as funções:

```javascript
// Logo após a função signInWithGoogle, adicione:

const signInWithApple = useCallback(async () => {
  setLoading(true);
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { 
        redirectTo: window.location.origin,
        scopes: 'name email'
      }
    });
    if (error) throw error;
    console.log('✅ Redirecionando para Apple...');
  } catch (error) {
    console.error('❌ Erro no login com Apple:', error);
    toast({ variant: "destructive", title: "Erro com Login Apple", description: error.message });
    setLoading(false);
    throw error;
  }
}, [toast]);

const signInWithFacebook = useCallback(async () => {
  setLoading(true);
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: { 
        redirectTo: window.location.origin,
        scopes: 'email public_profile'
      }
    });
    if (error) throw error;
    console.log('✅ Redirecionando para Facebook...');
  } catch (error) {
    console.error('❌ Erro no login com Facebook:', error);
    toast({ variant: "destructive", title: "Erro com Login Facebook", description: error.message });
    setLoading(false);
    throw error;
  }
}, [toast]);
```

**No `value` do AuthContext.Provider, adicione:**
```javascript
const value = useMemo(() => ({
  user,
  loading,
  profile,
  login,
  register,
  logout,
  signInWithGoogle,
  signInWithApple,    // ⭐ NOVO
  signInWithFacebook, // ⭐ NOVO
  updateProfile,
  uploadAvatar,
}), [user, loading, profile, login, register, logout, signInWithGoogle, signInWithApple, signInWithFacebook, updateProfile, uploadAvatar]);
```

---

### **2. Criar Componente SocialLoginButtons**

Crie o arquivo: `src/features/shared/components/auth/SocialLoginButtons.jsx`

Copie o conteúdo do arquivo que está nos outputs.

---

### **3. Substituir LoginPage**

Substitua: `src/features/shared/pages/LoginPage.jsx`

Pelo arquivo que está nos outputs.

---

### **4. Substituir RegisterPage**

Substitua: `src/features/shared/pages/RegisterPage.jsx`

Pelo arquivo que está nos outputs.

---

## ⚙️ Configuração no Supabase

### **Apple Sign In**

1. Acesse: https://developer.apple.com
2. Crie um **Service ID** para Sign in with Apple
3. Configure os **Return URLs**:
   - Development: `http://localhost:3000`
   - Production: `https://app.mesapra2.com`
4. No Supabase Dashboard → Authentication → Providers → Apple:
   - Service ID: (seu service ID)
   - Secret Key: (gere no Apple Developer)
   - Ative o provider

### **Facebook Login**

1. Acesse: https://developers.facebook.com
2. Crie um **Facebook App**
3. Adicione o produto **Facebook Login**
4. Configure **Valid OAuth Redirect URIs**:
   ```
   https://seu-projeto.supabase.co/auth/v1/callback
   ```
5. No Supabase Dashboard → Authentication → Providers → Facebook:
   - App ID: (seu app ID)
   - App Secret: (seu app secret)
   - Ative o provider

### **Google (já configurado)**

Mantenha como está.

---

## 🎨 Visual dos Botões

### Google
- Fundo branco
- Logo colorido do Google
- Texto: "Continuar com Google"

### Apple
- Fundo preto
- Logo branco da Apple
- Texto: "Continuar com Apple"

### Facebook
- Fundo azul (#1877F2)
- Logo branco do Facebook
- Texto: "Continuar com Facebook"

---

## 🧪 Como Testar

1. Acesse `/login` ou `/register`
2. Veja os 3 botões sociais
3. Clique em cada um:
   - **Google** → Deve redirecionar para login Google
   - **Apple** → Deve redirecionar para login Apple (quando configurado)
   - **Facebook** → Deve redirecionar para login Facebook (quando configurado)

---

## 📋 Checklist

- [ ] Funções adicionadas no AuthContext
- [ ] Componente SocialLoginButtons criado
- [ ] LoginPage atualizado
- [ ] RegisterPage atualizado
- [ ] Apple configurado no Supabase
- [ ] Facebook configurado no Supabase
- [ ] Testado em desenvolvimento
- [ ] Testado em produção

---

## 🔍 Estrutura de Arquivos

```
src/
├── contexts/
│   └── AuthContext.jsx (✏️ EDITAR - adicionar funções)
├── features/
│   └── shared/
│       ├── components/
│       │   └── auth/
│       │       └── SocialLoginButtons.jsx (✨ NOVO)
│       └── pages/
│           ├── LoginPage.jsx (🔄 SUBSTITUIR)
│           └── RegisterPage.jsx (🔄 SUBSTITUIR)
```

---

## 💡 Notas Importantes

1. **Apple exige HTTPS** em produção
2. **Facebook precisa revisar o app** antes de ir ao ar
3. **Google já funciona** (se configurado)
4. Os botões aparecem **acima** do formulário email/senha
5. Divisor "ou continue com email" separa os métodos

---

## 🎯 Resultado Final

Tela de login/registro com:
- ✅ 3 botões sociais no topo (Google, Apple, Facebook)
- ✅ Divisor visual elegante
- ✅ Formulário email/senha abaixo
- ✅ Design consistente e profissional
- ✅ Responsivo e acessível

---

**Pronto para integrar! 🚀**