import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from "react-helmet-async";
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/features/shared/components/ui/button';
import { Input } from '@/features/shared/components/ui/input';
import { Label } from '@/features/shared/components/ui/label';
import { useToast } from '@/features/shared/components/ui/use-toast';

const RegisterPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({
        variant: "destructive",
        title: "Senha inválida",
        description: "A senha deve ter pelo menos 6 caracteres.",
      });
      return;
    }
    setIsLoading(true);
    try {
      await register({ name, email, password });
      navigate('/dashboard');
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Erro no Cadastro",
        description: error.message || "Tente novamente.",
      });
      setIsLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Cadastro | Mesapra2</title>
      </Helmet>
      <div className="flex flex-col gap-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Crie sua conta
          </h2>
          <p className="text-muted-foreground mt-1">
            Comece a sua jornada no Mesapra2.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome completo"
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
              disabled={isLoading}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Criando conta...' : 'Cadastrar'}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          Já tem uma conta?{' '}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Faça login
          </Link>
        </p>
      </div>
    </>
  );
};

export default RegisterPage;