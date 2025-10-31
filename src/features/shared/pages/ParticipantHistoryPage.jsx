// src/features/shared/pages/ParticipantHistoryPage.jsx
import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Calendar, Camera, Trash2, RefreshCw, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/features/shared/components/ui/button';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { format, differenceInMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import EventPhotosService from '@/services/EventPhotosService';
import { useToast } from '@/features/shared/components/ui/use-toast';

const ParticipantHistoryPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingPhotoId, setDeletingPhotoId] = useState(null);

  useEffect(() => {
    if (user) {
      loadUserPhotos();
    }
  }, [user]);

  const loadUserPhotos = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Buscar todas as fotos do usuário
      const { data, error } = await supabase
        .from('event_photos')
        .select(`
          *,
          event:events!event_photos_event_id_fkey(
            id,
            title,
            start_time,
            end_time,
            status,
            partner:partners(id, name)
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'aprovado')
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log('✅ Fotos carregadas:', data?.length || 0);
      setPhotos(data || []);
    } catch (error) {
      console.error('❌ Erro ao carregar fotos:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível carregar seu histórico de fotos.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePhoto = async (photoId) => {
    if (!window.confirm('Tem certeza que deseja deletar esta foto?')) return;

    setDeletingPhotoId(photoId);
    try {
      const success = await EventPhotosService.deleteEventPhoto(photoId, user.id);
      if (success) {
        toast({
          title: 'Foto deletada!',
          description: 'A foto foi removida com sucesso.'
        });
        await loadUserPhotos(); // Recarregar lista
      } else {
        throw new Error('Falha ao deletar foto');
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível deletar a foto.'
      });
    } finally {
      setDeletingPhotoId(null);
    }
  };

  const canChangePhoto = (photo) => {
    if (!photo.event) return false;
    
    // Só pode trocar em eventos concluídos
    if (photo.event.status !== 'Concluído') return false;
    
    const eventEndTime = new Date(photo.event.end_time);
    const monthsSinceEnd = differenceInMonths(new Date(), eventEndTime);
    
    // Pode trocar por até 6 meses
    return monthsSinceEnd < 6;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Meu Histórico de Fotos - Mesapra2</title>
      </Helmet>

      <div className="space-y-8 py-6 px-4">
        <div>
          <h1 className="text-4xl font-bold gradient-text mb-2">
            Histórico de Fotos
          </h1>
          <p className="text-white/60 text-lg">
            Suas fotos dos eventos que participou
          </p>
          {photos.length > 0 && (
            <p className="text-white/40 text-sm mt-2">
              {photos.length} {photos.length === 1 ? 'foto publicada' : 'fotos publicadas'}
            </p>
          )}
        </div>

        {/* Botão Atualizar */}
        <div className="flex justify-end">
          <Button
            onClick={loadUserPhotos}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </Button>
        </div>

        {/* Grid de Fotos */}
        {photos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {photos.map((photo, index) => (
              <motion.div
                key={photo.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="glass-effect rounded-2xl border border-white/10 overflow-hidden h-full flex flex-col">
                  {/* Imagem */}
                  <div className="relative aspect-square overflow-hidden bg-white/5">
                    <img
                      src={photo.photo_url}
                      alt={`Foto do evento ${photo.event?.title || ''}`}
                      className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                      onError={(e) => {
                        e.target.src = 'https://ui-avatars.com/api/?name=Foto&size=400&background=8b5cf6&color=fff';
                      }}
                    />
                    
                    {/* Overlay com info */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <p className="text-white font-semibold text-sm">
                          {photo.event?.title || 'Evento'}
                        </p>
                        <p className="text-white/70 text-xs mt-1">
                          {format(new Date(photo.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Informações */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-white font-semibold mb-2 line-clamp-2">
                        {photo.event?.title || 'Evento sem título'}
                      </h3>
                      
                      {photo.event?.partner && (
                        <p className="text-white/60 text-sm mb-2">
                          📍 {photo.event.partner.name}
                        </p>
                      )}

                      <div className="flex items-center gap-2 text-white/40 text-xs mb-3">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {format(new Date(photo.event?.start_time || photo.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      </div>

                      {/* Badge do status do evento */}
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                          photo.event?.status === 'Concluído'
                            ? 'bg-green-500/20 text-green-300'
                            : 'bg-yellow-500/20 text-yellow-300'
                        }`}
                      >
                        {photo.event?.status || 'Evento'}
                      </span>
                    </div>

                    {/* Ações */}
                    <div className="flex gap-2 mt-4 pt-4 border-t border-white/10">
                      {/* Link para evento */}
                      {photo.event && (
                        <Link to={`/event/${photo.event.id}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full">
                            Ver Evento
                          </Button>
                        </Link>
                      )}

                      {/* Botão Trocar (se pode) */}
                      {canChangePhoto(photo) && (
                        <Link to={`/event/${photo.event.id}`} className="flex-1">
                          <Button 
                            size="sm" 
                            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                          >
                            <Camera className="w-4 h-4 mr-1" />
                            Trocar
                          </Button>
                        </Link>
                      )}

                      {/* Botão Deletar */}
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeletePhoto(photo.id)}
                        disabled={deletingPhotoId === photo.id}
                        className="flex-shrink-0"
                      >
                        {deletingPhotoId === photo.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          /* Mensagem quando não há fotos */
          <div className="glass-effect rounded-2xl p-12 border border-white/10 text-center">
            <ImageIcon className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <p className="text-white/60 text-lg mb-4">
              Você ainda não publicou fotos
            </p>
            <p className="text-white/40 text-sm mb-6">
              Participe de eventos e compartilhe suas experiências através de fotos!
            </p>
            <Link to="/events">
              <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                <Camera className="w-5 h-5 mr-2" />
                Explorar Eventos
              </Button>
            </Link>
          </div>
        )}
      </div>
    </>
  );
};

export default ParticipantHistoryPage;