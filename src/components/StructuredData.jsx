import { Helmet } from 'react-helmet-async';

/**
 * Componente para inserir dados estruturados (JSON-LD) para SEO
 */
const StructuredData = ({ 
  type = 'WebApplication',
  page = 'dashboard',
  user = null,
  event = null 
}) => {
  
  // Schema base da aplicação
  const getWebApplicationSchema = () => ({
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "MesaPra2",
    "description": "Plataforma de jantares sociais que conecta pessoas através de experiências gastronômicas únicas",
    "url": "https://mesapra2.com",
    "applicationCategory": "SocialNetworkingApplication",
    "operatingSystem": "Web",
    "browserRequirements": "Requires JavaScript, HTML5",
    "provider": {
      "@type": "Organization",
      "name": "MesaPra2",
      "url": "https://mesapra2.com",
      "logo": "https://mesapra2.com/logo.png",
      "sameAs": [
        "https://instagram.com/mesapra2",
        "https://facebook.com/mesapra2"
      ]
    },
    "offers": {
      "@type": "Offer",
      "category": "Social Dining",
      "availability": "https://schema.org/InStock"
    },
    "featureList": [
      "Criação de eventos gastronômicos",
      "Participação em jantares sociais",
      "Sistema de avaliações",
      "Chat em tempo real",
      "Geolocalização de restaurantes",
      "Perfil verificado"
    ]
  });

  // Schema para dashboard
  const getDashboardSchema = () => ({
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Dashboard - MesaPra2",
    "description": "Painel principal para gerenciar eventos, participações e configurações no MesaPra2",
    "url": window.location.href,
    "isPartOf": {
      "@type": "WebSite",
      "name": "MesaPra2",
      "url": "https://mesapra2.com"
    },
    "breadcrumb": {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://mesapra2.com"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Dashboard",
          "item": "https://mesapra2.com/dashboard"
        }
      ]
    }
  });

  // Schema para perfil de usuário
  const getUserProfileSchema = () => {
    if (!user) return null;
    
    return {
      "@context": "https://schema.org",
      "@type": "Person",
      "name": user.full_name || user.email,
      "identifier": user.id,
      "memberOf": {
        "@type": "Organization",
        "name": "MesaPra2"
      },
      "hasCredential": user.is_verified ? {
        "@type": "EducationalOccupationalCredential",
        "credentialCategory": "Perfil Verificado",
        "recognizedBy": {
          "@type": "Organization",
          "name": "MesaPra2"
        }
      } : undefined
    };
  };

  // Schema para evento
  const getEventSchema = () => {
    if (!event) return null;

    return {
      "@context": "https://schema.org",
      "@type": "SocialEvent",
      "name": event.title,
      "description": event.description,
      "startDate": event.event_date,
      "location": {
        "@type": "Restaurant",
        "name": event.restaurant_name,
        "address": event.restaurant_address
      },
      "organizer": {
        "@type": "Person",
        "name": event.organizer_name
      },
      "attendeeCapacity": event.max_participants,
      "isAccessibleForFree": event.entry_fee === 0,
      "offers": event.entry_fee > 0 ? {
        "@type": "Offer",
        "price": event.entry_fee,
        "priceCurrency": "BRL",
        "category": "Entry Fee"
      } : undefined,
      "eventStatus": "https://schema.org/EventScheduled",
      "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode"
    };
  };

  // Schema para organização
  const getOrganizationSchema = () => ({
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "MesaPra2",
    "description": "Conectamos pessoas através de experiências gastronômicas únicas",
    "url": "https://mesapra2.com",
    "logo": "https://mesapra2.com/logo.png",
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "customer service",
      "email": "contato@mesapra2.com"
    },
    "foundingDate": "2024",
    "areaServed": {
      "@type": "Country",
      "name": "Brasil"
    },
    "serviceType": "Social Dining Platform",
    "slogan": "Jantares sociais que conectam pessoas"
  });

  // Selecionar schemas baseado no tipo de página
  const getSchemas = () => {
    const schemas = [getWebApplicationSchema(), getOrganizationSchema()];
    
    if (page === 'dashboard') {
      schemas.push(getDashboardSchema());
    }
    
    if (user) {
      const userSchema = getUserProfileSchema();
      if (userSchema) schemas.push(userSchema);
    }
    
    if (event) {
      const eventSchema = getEventSchema();
      if (eventSchema) schemas.push(eventSchema);
    }
    
    return schemas;
  };

  return (
    <Helmet>
      {getSchemas().map((schema, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(schema, null, 2)}
        </script>
      ))}
    </Helmet>
  );
};

export default StructuredData;