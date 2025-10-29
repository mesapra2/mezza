import { useState, useEffect, useCallback } from 'react'; // 1. IMPORTAMOS O useCallback
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
// Adicionamos 'Gift' para a seção de benefícios
import { MapPin, Phone, Mail, Clock, Calendar, Users, ArrowLeft, ExternalLink, Gift } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/features/shared/components/ui/button';
<<<<<<< HEAD
import { GoogleBusinessBadge } from '@/features/shared/components/ui/GoogleBusinessBadge';
=======
//import { GoogleBusinessBadge } from '@/features/shared/components/ui/GoogleBusinessBadge.jsx';
>>>>>>> 7e4ec2f2c8c5f0a65bc5f08c9ff536b9106e1370
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// --- Função Helper para URLs de Fotos de Eventos ---
// (Estou assumindo que o bucket se chama 'event-photos')
const getEventPhotoUrl = (photoPath) => {
  if (!photoPath) return null;
  if (photoPath.startsWith('http')) return photoPath;
  
  const { data } = supabase.storage
    .from('event-photos') // <-- ASSUMINDO ESTE NOME DE BUCKET
    .getPublicUrl(photoPath);
  
  return data.publicUrl;
};
// ----------------------------------------------------


const PartnerProfilePage = () => {
  const { id } = useParams();
  const [partner, setPartner] = useState(null);
  const [events, setEvents] = useState([]);
  const [pastEvents, setPastEvents] = useState([]); // <-- NOVO ESTADO (Carrossel)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 2. ENVOLVEMOS 'loadPartnerData' COM 'useCallback'
  // Esta função agora só será recriada se o 'id' mudar.
  const loadPartnerData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Carrega dados do parceiro
      const { data: partnerData, error: partnerError } = await supabase
        .from('partners')
        .select('*')
        .eq('id', id)
        .single();

      if (partnerError) throw partnerError;
      setPartner(partnerData);

      // Carrega eventos FUTUROS do restaurante
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('partner_id', id)
        .in('status', ['Aberto', 'Confirmado'])
        .order('start_time', { ascending: true })
        .limit(6);

      if (eventsError) throw eventsError;
      setEvents(eventsData || []);

      // --- NOVO: Carrega eventos PASSADOS com fotos (para o Carrossel) ---
      const { data: pastEventsData, error: pastEventsError } = await supabase
        .from('events')
        .select('id, title, event_photos')
        .eq('partner_id', id)
        .eq('status', 'Concluído')
        .not('event_photos', 'is', null) // Só traz eventos que tenham fotos
        .order('start_time', { ascending: false }) // Mais recentes primeiro
        .limit(5); // Limita a 5 eventos
      
      if (pastEventsError) {
        console.error("Erro ao buscar eventos passados:", pastEventsError);
      } else {
        // Processa as URLs das fotos
        const processedPastEvents = pastEventsData.map(event => ({
          ...event,
          photos: event.event_photos.map(getEventPhotoUrl)
        }));
        setPastEvents(processedPastEvents || []);
      }
      // --- FIM DA NOVA QUERY ---

    } catch (err) {
      console.error('Erro ao carregar dados do parceiro:', err);
      setError('Não foi possível carregar as informações do restaurante.');
    } finally {
      setLoading(false);
    }
  }, [id]); // O 'id' é a dependência do useCallback

  // 3. AGORA O 'useEffect' DEPENDE DE 'loadPartnerData'
  // Ele só vai rodar quando a função (memorizada) mudar,
  // ou seja, quando o 'id' mudar.
  useEffect(() => {
    loadPartnerData();
  }, [loadPartnerData]); // <-- Erro corrigido!

  const getPartnerPhoto = (index = 0) => {
    if (!partner?.photos || !Array.isArray(partner.photos)) return null;
    if (partner.photos.length === 0) return null;
    
    const photo = partner.photos[index];
    if (!photo) return null;

    if (photo.startsWith('http')) return photo;

    // --- CORREÇÃO DO BUG ---
    // O bucket correto é 'photos' (como definido em PartnerSettings.jsx)
    const { data } = supabase.storage
      .from('photos') // <-- CORRIGIDO (estava 'partner-photos')
      .getPublicUrl(photo);
    
    return data.publicUrl;
  };
  // --- FIM DA CORREÇÃO ---

  const getAddress = () => {
    if (!partner?.address) return 'Endereço não informado';
    
    if (typeof partner.address === 'string') {
      return partner.address;
    }
    
    if (typeof partner.address === 'object') {
      const parts = [
        partner.address.street || partner.address.rua,
        partner.address.number || partner.address.numero,
        partner.address.neighborhood || partner.address.bairro,
        partner.address.city || partner.address.cidade,
        partner.address.state || partner.address.estado,
      ].filter(Boolean);
      return parts.length > 0 ? parts.join(', ') : 'Endereço não informado';
    }
    
    return 'Endereço não informado';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !partner) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-2xl font-bold text-white mb-4">Restaurante não encontrado</h2>
        <p className="text-white/60 mb-6">{error}</p>
        <Link to="/restaurants">
          <Button>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Restaurantes
          </Button>
        </Link>
      </div>
    );
  }

  const mainPhoto = getPartnerPhoto(0);
  const hasPhotos = partner.photos && partner.photos.length > 0;

  return (
    <>
      <Helmet>
        <title>{partner.name} - Mesapra2</title>
        <meta name="description" content={partner.description || `Conheça ${partner.name}`} />
      </Helmet>

      <div className="py-6 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-5xl mx-auto space-y-6"
        >
          {/* Header com botão voltar */}
          <Link to="/restaurants">
            <Button variant="ghost" className="text-white/60 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para Restaurantes
            </Button>
          </Link>

          {/* Banner / Foto Principal */}
          <div className="relative h-64 md:h-96 rounded-2xl overflow-hidden">
            {mainPhoto ? (
              <img
                src={mainPhoto}
                alt={partner.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(partner.name)}&size=800&background=8b5cf6&color=fff`;
                }}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                <span className="text-white/40 text-4xl font-bold">{partner.name[0]}</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <h1 className="text-4xl font-bold text-white mb-2">{partner.name}</h1>
              {partner.cuisine_type && (
                <span className="inline-block px-3 py-1 rounded-full bg-purple-500/30 text-purple-200 text-sm border border-purple-400/50">
                  {partner.cuisine_type}
                </span>
              )}
            </div>
          </div>

          {/* Galeria de Fotos (agora deve funcionar) */}
          {hasPhotos && partner.photos.length > 1 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {partner.photos.slice(1, 5).map((photo, index) => {
                const photoUrl = getPartnerPhoto(index + 1);
                if (!photoUrl) return null;
                
                return (
                  <div key={index} className="relative h-32 rounded-lg overflow-hidden">
                    <img
                      src={photoUrl}
                      alt={`${partner.name} - Foto ${index + 2}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* Informações do Restaurante */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Informações de Contato */}
            <div className="glass-effect rounded-2xl p-6 border border-white/10">
              <h2 className="text-xl font-semibold text-white mb-4">Informações</h2>
              
              <div className="space-y-4">
                {/* Google Business Badge - Destaque */}
                {partner.google_business_url && (
                  <div className="pb-4 mb-4 border-b border-white/10">
                    <GoogleBusinessBadge 
                      url={partner.google_business_url}
                      variant="default"
                      className="w-full justify-center"
                    />
                    <p className="text-xs text-white/40 text-center mt-2">
                      Veja as avaliações dos nossos clientes
                    </p>
                  </div>
                )}

                {partner.address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-white/60 text-xs mb-1">Endereço</p>
                      <p className="text-white text-sm">{getAddress()}</p>
                    </div>
                  </div>
                )}

                {partner.phone && (
                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-white/60 text-xs mb-1">Telefone</p>
                      <a href={`tel:${partner.phone}`} className="text-white text-sm hover:text-purple-300">
                        {partner.phone}
                      </a>
                    </div>
                  </div>
                )}

                {partner.email && (
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-white/60 text-xs mb-1">Email</p>
                      <a href={`mailto:${partner.email}`} className="text-white text-sm hover:text-purple-300">
                        {partner.email}
                      </a>
                    </div>
                  </div>
                )}

                {partner.website && (
                  <div className="flex items-start gap-3">
                    <ExternalLink className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-white/60 text-xs mb-1">Website</p>
                      <a 
                        href={partner.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-white text-sm hover:text-purple-300"
                      >
                        Visitar site
                      </a>
                    </div>
                  </div>
                )}

                {partner.opening_hours && (
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-white/60 text-xs mb-1">Horário de Funcionamento</p>
                      <p className="text-white text-sm whitespace-pre-line">{partner.opening_hours}</p>
                    </div>
                  </div>
                )}

                {/* --- NOVA SEÇÃO: BENEFÍCIOS --- */}
                {partner.benefits && partner.benefits.length > 0 && (
                  <div className="flex items-start gap-3 pt-4 border-t border-white/10">
                    <Gift className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-white/60 text-xs mb-1">Benefícios e Vantagens</p>
                      <ul className="text-white text-sm list-disc list-inside space-y-1">
                        {partner.benefits.map((benefit) => (
                          <li key={benefit}>{benefit}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
                {/* --- FIM DA SEÇÃO BENEFÍCIOS --- */}
              </div>
            </div>

            {/* Descrição */}
            {partner.description && (
              <div className="glass-effect rounded-2xl p-6 border border-white/10">
                <h2 className="text-xl font-semibold text-white mb-4">Sobre</h2>
                <p className="text-white/80 text-sm leading-relaxed whitespace-pre-line">
                  {partner.description}
                </p>
              </div>
            )}
          </div>

          {/* Eventos FUTUROS do Restaurante */}
          {events.length > 0 && (
            <div className="glass-effect rounded-2xl p-6 border border-white/10">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">Próximos Eventos</h2>
                <Link to="/events">
                  <Button variant="ghost" size="sm">
                    Ver todos
                  </Button>
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {events.map((event) => (
                  <Link key={event.id} to={`/event/${event.id}`}>
                    <div className="glass-effect rounded-lg p-4 border border-white/10 hover:bg-white/5 transition-colors cursor-pointer">
                      <h3 className="text-white font-semibold mb-2 line-clamp-2">
                        {event.title}
                      </h3>
                      <div className="space-y-1 text-sm text-white/60">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>{format(new Date(event.start_time), "dd/MM 'às' HH:mm", { locale: ptBR })}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          <span>{event.vagas} vagas</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* --- NOVA SEÇÃO: CARROSSEL DE EVENTOS PASSADOS --- */}
          {pastEvents.length > 0 && (
            <div className="glass-effect rounded-2xl p-6 border border-white/10">
              <h2 className="text-xl font-semibold text-white mb-6">Galeria de Eventos Passados</h2>
              <div className="flex overflow-x-auto space-x-4 pb-4">
                {/* Criamos um "carrossel" simples com scroll horizontal */}
                {pastEvents.flatMap((event) => 
                  event.photos.map((photoUrl, index) => (
                    <div key={`${event.id}-${index}`} className="flex-shrink-0 w-64 md:w-80">
                      <div className="relative aspect-video rounded-lg overflow-hidden border border-white/10">
                        {photoUrl ? (
                          <img
                            src={photoUrl}
                            alt={`${event.title} - Foto ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-white/5 flex items-center justify-center">
                            <span className="text-white/40 text-xs">Erro ao carregar foto</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <p className="absolute bottom-2 left-3 text-white text-sm font-medium truncate" title={event.title}>
                          {event.title}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          {/* --- FIM DA SEÇÃO CARROSSEL --- */}

        </motion.div>
      </div>
    </>
  );
};

export default PartnerProfilePage;