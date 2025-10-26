import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Users, MapPin, Loader2 } from 'lucide-react';

const PeoplePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPeople();
  }, []);

  const fetchPeople = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', user.id)
        // .eq('is_public', true) // ⚠️ Descomente após criar a coluna is_public no banco
        .order('username', { ascending: true });

      if (fetchError) throw fetchError;

      console.log('Dados recebidos:', data);
      setPeople(data || []);
    } catch (err) {
      console.error('Erro ao carregar pessoas:', err);
      setError(`Não foi possível carregar as pessoas: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const sendPoke = async (targetUserId) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data: existingPoke } = await supabase
        .from('pokes')
        .select('id')
        .eq('from_user_id', user.id)
        .eq('to_user_id', targetUserId)
        .gte('created_at', `${today}T00:00:00Z`)
        .lte('created_at', `${today}T23:59:59Z`);

      if (existingPoke.length > 0) {
        alert('Você já cutucou essa pessoa hoje!');
        return;
      }

      const { error } = await supabase
        .from('pokes')
        .insert([
          {
            from_user_id: user.id,
            to_user_id: targetUserId,
            created_at: new Date().toISOString()
          }
        ]);

      if (error) throw error;

      alert('Cutucada enviada com sucesso! 👋');
    } catch (err) {
      console.error('Erro ao enviar cutucada:', err);
      alert('Não foi possível enviar a cutucada.');
    }
  };

  const viewProfile = (userId) => {
    navigate(`/profile/${userId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={fetchPeople}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <div className="py-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 gradient-text">Pessoas Ativas</h1>
        <p className="text-white/60">Conecte-se com outros membros da comunidade</p>
      </div>

      {/* Sobre as Cutucadas */}
      <div className="mb-6 p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <span className="text-2xl">👋</span>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-1">Sobre as Cutucadas</h3>
            <p className="text-white/70 text-sm">
              Você pode cutucar cada pessoa uma vez por dia. A cutucada é uma forma 
              leve de demonstrar interesse em conhecer alguém!
            </p>
          </div>
        </div>
      </div>

      {/* Lista de Pessoas */}
      {people.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-16 h-16 mx-auto mb-4 text-white/20" />
          <h3 className="text-xl font-semibold mb-2">Nenhuma pessoa ativa no momento</h3>
          <p className="text-white/60">
            Volte mais tarde para ver novos membros da comunidade.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {people.map((person) => (
            <div
              key={person.id}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all duration-300"
            >
              {/* Avatar e Nome */}
              <div className="flex items-center gap-4 mb-4">
                <div className="relative">
                  {person.avatar_url ? (
                    <img
                      src={person.avatar_url}
                      alt={person.username || 'Usuário'} // Usando username como fallback
                      className="w-16 h-16 rounded-full object-cover border-2 border-purple-500/30"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xl font-bold">
                      {(person.username || 'U')[0].toUpperCase()} // Usando username como fallback
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg truncate">
                    {person.username || 'Usuário'} // Usando username como fallback
                  </h3>
                  {person.username && (
                    <p className="text-white/60 text-sm">@{person.username}</p>
                  )}
                </div>
              </div>

              {/* Bio */}
              {person.bio && (
                <p className="text-white/70 text-sm mb-4 line-clamp-2">
                  {person.bio}
                </p>
              )}

              {/* Informações */}
              <div className="space-y-2 mb-4">
                {person.location && (
                  <div className="flex items-center gap-2 text-white/60 text-sm">
                    <MapPin className="w-4 h-4" />
                    <span className="truncate">{person.location}</span>
                  </div>
                )}
                {person.dietary_preferences && person.dietary_preferences.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {person.dietary_preferences.slice(0, 3).map((pref, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full"
                      >
                        {pref}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Ações */}
              <div className="flex gap-2">
                <button
                  onClick={() => sendPoke(person.id)}
                  className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <span>👋</span>
                  Cutucar
                </button>
                <button
                  onClick={() => viewProfile(person.id)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors"
                  title="Ver Perfil"
                >
                  <Users className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PeoplePage;