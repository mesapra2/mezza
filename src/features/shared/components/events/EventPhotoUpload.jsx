// src/features/shared/components/events/EventPhotosUpload.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Upload, Trash2, Loader, CheckCircle, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/features/shared/components/ui/button';
import EventPhotosService from '@/services/EventPhotosService';
import { useToast } from '@/features/shared/components/ui/use-toast';

const EventPhotosUpload = ({ eventId, userId, isParticipant, eventStatus }) => {
  const [uploading, setUploading] = useState(false);
  const [userPhoto, setUserPhoto] = useState(null);
  const [allPhotos, setAllPhotos] = useState([]);
  const [stats, setStats] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef(null);
  const { toast } = useToast();

  // Carregar foto do usuário e estatísticas
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Buscar foto do usuário
      const photo = await EventPhotosService.getUserPhotoForEvent(eventId, userId);
      setUserPhoto(photo);

      // Buscar todas as fotos do evento
      const photos = await EventPhotosService.getEventPhotos(eventId);
      setAllPhotos(photos || []);

      // Buscar estatísticas
      const photoStats = await EventPhotosService.getPhotoStats(eventId);
      setStats(photoStats);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      // Não mostrar toast de erro no carregamento inicial para não incomodar o usuário
      setAllPhotos([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [eventId, userId]);

  useEffect(() => {
    if (eventId && userId) {
      loadData();
    }
  }, [eventId, userId, loadData]);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validação de tipo
    if (!file.type.startsWith('image/')) {
      toast({
        variant: 'destructive',
        title: 'Arquivo inválido',
        description: 'Por favor, selecione uma imagem (JPG, PNG ou WEBP)'
      });
      return;
    }

    // Validação de tamanho (10MB antes do redimensionamento)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'Arquivo muito grande',
        description: 'O arquivo deve ter no máximo 10MB'
      });
      return;
    }

    setUploading(true);

    try {
      const result = await EventPhotosService.uploadEventPhoto(eventId, userId, file);

      if (result.success) {
        toast({
          title: '📸 Foto enviada!',
          description: 'Sua foto foi adicionada ao evento com sucesso'
        });
        await loadData(); // Recarregar dados
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro ao enviar foto',
          description: result.error || 'Tente novamente'
        });
      }
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao enviar foto',
        description: error.message || 'Ocorreu um erro inesperado'
      });
    } finally {
      setUploading(false);
      // Limpar input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeletePhoto = async () => {
    if (!userPhoto) return;

    setDeleting(true);

    try {
      const success = await EventPhotosService.deleteEventPhoto(userPhoto.id, userId);

      if (success) {
        toast({
          title: '🗑️ Foto removida',
          description: 'Você pode enviar outra foto se desejar'
        });
        await loadData();
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro ao remover foto',
          description: 'Tente novamente'
        });
      }
    } catch (error) {
      console.error('Erro ao deletar:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao remover foto',
        description: error.message || 'Ocorreu um erro inesperado'
      });
    } finally {
      setDeleting(false);
    }
  };

  // Não mostrar nada se não for participante ou se o evento não estiver finalizado
  if (!isParticipant || eventStatus !== 'Finalizado') {
    return null;
  }

  // Mostrar loading enquanto carrega
  if (loading) {
    return (
      <div className="glass-effect rounded-2xl p-6 border border-white/10">
        <div className="flex items-center justify-center py-12">
          <Loader className="w-8 h-8 text-purple-500 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="glass-effect rounded-2xl p-6 border border-white/10">
      <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
        <ImageIcon className="w-5 h-5" />
        📸 Fotos do Evento
      </h2>

      {/* Estatísticas */}
      {stats && (
        <div className="mb-6 p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
          <p className="text-sm text-purple-300">
            {stats.totalPhotos} de {stats.totalParticipants} participantes enviaram fotos
            {stats.percentageWithPhotos !== undefined && ` (${stats.percentageWithPhotos}%)`}
          </p>
        </div>
      )}

      {/* Área de Upload / Foto do Usuário */}
      <div className="mb-6">
        {userPhoto ? (
          // Mostrar foto enviada
          <div className="relative">
            <div className="relative rounded-lg overflow-hidden border-2 border-green-500/30">
              <img
                src={userPhoto.photo_url}
                alt="Sua foto do evento"
                className="w-full h-64 object-cover"
              />
              <div className="absolute top-2 right-2 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Enviada
              </div>
            </div>
            
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeletePhoto}
              disabled={deleting}
              className="mt-3 w-full"
            >
              {deleting ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Removendo...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remover Foto
                </>
              )}
            </Button>
          </div>
        ) : (
          // Mostrar área de upload
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploading}
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full border-2 border-dashed border-white/20 hover:border-purple-500/50 rounded-lg p-8 transition-all duration-300 hover:bg-purple-500/5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader className="w-10 h-10 text-purple-500 animate-spin" />
                  <p className="text-sm text-white/70">
                    Processando e enviando foto...
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <Upload className="w-10 h-10 text-white/40" />
                  <div>
                    <p className="text-white font-medium mb-1">
                      Clique para enviar sua foto
                    </p>
                    <p className="text-sm text-white/60">
                      JPG, PNG ou WEBP (máx. 2MB após redimensionamento)
                    </p>
                  </div>
                </div>
              )}
            </button>

            <p className="text-xs text-white/50 mt-3 text-center">
              💡 Imagens grandes serão redimensionadas automaticamente
            </p>
          </div>
        )}
      </div>

      {/* Galeria de Fotos de Todos os Participantes */}
      {allPhotos.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">
            Galeria do Evento ({allPhotos.length})
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {allPhotos.map((photo) => (
              <div key={photo.id} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden border border-white/10">
                  <img
                    src={photo.photo_url}
                    alt={`Foto de ${photo.user?.username || 'Participante'}`}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                </div>
                
                {/* Overlay com nome do usuário */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2 rounded-lg">
                  <p className="text-white text-xs font-medium truncate">
                    {photo.user?.username || photo.user?.full_name || 'Participante'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mensagem quando ninguém enviou fotos ainda */}
      {allPhotos.length === 0 && !userPhoto && (
        <div className="text-center py-8 text-white/50">
          <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">
            Seja o primeiro a compartilhar uma foto deste evento!
          </p>
        </div>
      )}
    </div>
  );
};

EventPhotosUpload.propTypes = {
  eventId: PropTypes.number.isRequired,
  userId: PropTypes.string.isRequired,
  isParticipant: PropTypes.bool.isRequired,
  eventStatus: PropTypes.string.isRequired
};

export default EventPhotosUpload;