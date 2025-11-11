import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Calendar, Mail, Lock, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/features/shared/components/ui/button';
import { Input } from '@/features/shared/components/ui/input';
import { Label } from '@/features/shared/components/ui/label';

const Signup = () => {
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    bio: '',
  });
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signup(formData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <>
      <Helmet>
        <title>Cadastro - Mesapra2</title>
        <meta name="description" content="Crie sua conta no Mesapra2 e comece a participar de eventos sociais em restaurantes." />
      </Helmet>

      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="glass-effect rounded-2xl p-8 border border-white/10">
            <div className="flex justify-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Calendar className="w-8 h-8 text-white" />
              </div>
            </div>

            <h1 className="text-3xl font-bold text-center mb-2 gradient-text">
              Junte-se ao Mesapra2
            </h1>
            <p className="text-center text-white/60 mb-8">
              Crie sua conta e comece a explorar
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <Input
                    id="nome"
                    name="nome"
                    type="text"
                    placeholder="Seu nome"
                    value={formData.nome}
                    onChange={handleChange}
                    className="pl-10 glass-effect border-white/10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={formData.email}
                    onChange={handleChange}
                    className="pl-10 glass-effect border-white/10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="senha">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <Input
                    id="senha"
                    name="senha"
                    type="password"
                    placeholder="••••••••"
                    value={formData.senha}
                    onChange={handleChange}
                    className="pl-10 glass-effect border-white/10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio (opcional)</Label>
                <Input
                  id="bio"
                  name="bio"
                  type="text"
                  placeholder="Conte um pouco sobre você"
                  value={formData.bio}
                  onChange={handleChange}
                  className="glass-effect border-white/10"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 h-12 text-base font-semibold"
              >
                {loading ? 'Criando conta...' : 'Criar conta'}
              </Button>
            </form>

            <p className="text-center text-white/60 mt-6">
              Já tem uma conta?{' '}
              <Link to="/login" className="text-purple-400 hover:text-purple-300 font-semibold">
                Faça login
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default Signup;