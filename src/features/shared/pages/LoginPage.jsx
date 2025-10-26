import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet, HelmetProvider } from 'react-helmet-async'; // Adicionado HelmetProvider
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/features/shared/components/ui/button';
import { Input } from '@/features/shared/components/ui/input';
import { Label } from '@/features/shared/components/ui/label';

// Componente para o ícone do Google (SVG) - Exportado como named export
export const GoogleIcon = () => (
  <svg className="w-5 h-5 mr-2" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C42.021,35.591,44,30.032,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
  </svg>
);

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Erro ao entrar. Verifique suas credenciais.');
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Erro ao entrar com Google.');
    }
  };

  return (
    <HelmetProvider> {/* Agora devidamente definido */}
      <Helmet>
        <title>Login | Mesapra2</title>
      </Helmet>
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <div className="w-full max-w-md p-8 space-y-6 bg-gray-800 rounded-xl shadow-lg">
          <h2 className="text-2xl font-bold text-center text-white">Entrar no Mesapra2</h2>
          
          <Button variant="outline" className="w-full" onClick={handleGoogleLogin}>
            <GoogleIcon />
            Entrar com Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Ou com email
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          {error && <p className="text-red-500 text-sm mt-4 text-center">{error}</p>}
          
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Ou continue com
              </span>
            </div>
          </div>

          <Button variant="outline" className="w-full" onClick={handleGoogleLogin}>
            <GoogleIcon />
            Google
          </Button>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Não tem uma conta?{' '}
            <Link to="/register" className="font-semibold text-primary hover:underline">
              Cadastre-se
            </Link>
          </p>
        </div>
      </div>
    </HelmetProvider>
  );
}