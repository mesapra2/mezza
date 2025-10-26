import { useState } from 'react';
import PropTypes from 'prop-types'; // 1. IMPORTAR A BIBLIOTECA
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/features/shared/components/ui/use-toast';
import { compressImage } from '@//utils'; // Reutilizando nossa função!
import { Button } from '@/features/shared/components/ui/button';
import { Input } from '@/features/shared/components/ui/input';
import { Label } from '@/features/shared/components/ui/label';
import { Loader2, Upload } from 'lucide-react';

/**
 * Componente para usuários fazerem upload de fotos para um evento.
 * @param {{ eventId: string | number }} props
 */
const EventPhotoUpload = ({ eventId }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handlePhotoUpload = async () => {
    if (!file) {
      toast({ variant: "destructive", title: "Nenhum arquivo selecionado" });
      return;
    }
    if (!user) {
      toast({ variant: "destructive", title: "Você precisa estar logado" });
      return;
    }
    if (!eventId) {
      console.error("EventPhotoUpload: eventId não foi fornecido.");
      return;
    }

    try {
      setUploading(true);

      // 1. Comprimir a imagem (usando a função de 'utils')
      const compressedFile = await compressImage(file);

      // 2. Gerar o nome de arquivo único e o caminho
      const fileExt = compressedFile.name.split('.').pop() || 'jpg';
      const timestamp = Date.now();
      
      // Formato: [ID_do_Evento]/[ID_do_Usuário]_[Timestamp].jpg
      // Ex: '25/uuid-123ab-cde45_1678886400000.jpg'
      const filePath = `${eventId}/${user.id}_${timestamp}.${fileExt}`;

      // 3. Fazer upload para o Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('event-photos') // O bucket que criamos
        .upload(filePath, compressedFile);

      if (uploadError) throw uploadError;

      // 4. Adicionar o caminho da foto ao array 'event_photos' na tabela 'events'
      // Pega o array atual
      const { data: eventData, error: fetchError } = await supabase
        .from('events')
        .select('event_photos')
        .eq('id', eventId)
        .single();

      if (fetchError) throw fetchError;

      const currentPhotos = eventData.event_photos || [];
      const newPhotos = [...currentPhotos, filePath]; // Adiciona o novo caminho

      // Salva o array atualizado
      const { error: updateError } = await supabase
        .from('events')
        .update({ event_photos: newPhotos })
        .eq('id', eventId);

      if (updateError) throw updateError;

      toast({
        title: "Foto enviada com sucesso!",
        description: "Obrigado por compartilhar seu momento.",
      });

      setFile(null); // Limpa o input

    } catch (error) {
      console.error('❌ Erro no upload de foto do evento:', error);
      toast({
        variant: "destructive",
        title: "Erro no upload",
        description: "Não foi possível enviar sua foto. " + error.message,
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="glass-effect rounded-2xl p-6 border border-white/10 space-y-4">
      <h3 className="text-lg font-semibold text-white">Compartilhe seus momentos</h3>
      <p className="text-sm text-white/60">
        Envie uma foto deste evento! (Após o envio, ela aparecerá na galeria do restaurante).
      </p>
      
      <div className="space-y-2">
        <Label htmlFor="event-photo-upload" className="text-white/80">Selecionar imagem</Label>
        <Input
          id="event-photo-upload"
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={uploading}
          className="glass-effect border-white/10 file:text-purple-300"
        />
      </div>

      <Button
        onClick={handlePhotoUpload}
        disabled={uploading || !file}
        className="w-full bg-purple-600 hover:bg-purple-700"
      >
        {uploading ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Upload className="w-4 h-4 mr-2" />
        )}
        {uploading ? 'Enviando...' : 'Fazer Upload'}
      </Button>
    </div>
  );
};

// 2. ADICIONAR ESTE BLOCO DE CÓDIGO
EventPhotoUpload.propTypes = {
  eventId: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number
  ]).isRequired
};
// ---------------------------------

export default EventPhotoUpload;