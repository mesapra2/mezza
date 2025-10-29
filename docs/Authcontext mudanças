# ✅ AuthContext.jsx Completo - O que mudou?

## 🆕 Novas Funções Adicionadas

### 1. signInWithApple (linha ~251)
```javascript
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
```

### 2. signInWithFacebook (linha ~269)
```javascript
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

### 3. Exportadas no Context Value (linha ~361)
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

## 📋 O que NÃO mudou

✅ Todas as funções existentes permanecem iguais:
- `login()`
- `register()`
- `logout()`
- `signInWithGoogle()`
- `updateProfile()`
- `uploadAvatar()`
- `getProfile()`
- `createProfileIfNotExists()`

✅ Toda a lógica de perfil de partner intacta
✅ Toda a lógica de navegação intacta
✅ Toda a lógica de loading intacta

---

## 🔧 Como Usar

Agora você pode usar no seu código:

```javascript
const { signInWithApple, signInWithFacebook } = useAuth();

// Login com Apple
await signInWithApple();

// Login com Facebook
await signInWithFacebook();
```

---

## 📦 Próximos Passos

1. **Substitua** seu `AuthContext.jsx` atual por este
2. **Configure** Apple e Facebook no Supabase Dashboard
3. **Use** nos componentes LoginPage e RegisterPage

Pronto! ✅