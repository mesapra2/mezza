import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '../contexts/AuthContext';
import StructuredData from './StructuredData';

/**
 * Componente SEO específico para o Dashboard
 * Combina MetaTags + Dados Estruturados + Otimizações específicas
 */
const SEODashboard = ({ 
  pageTitle = "Dashboard", 
  user = null,
  stats = null 
}) => {
  const { user: authUser } = useAuth();
  const currentUser = user || authUser;

  // Gerar título dinâmico baseado no usuário
  const generateTitle = () => {
    if (currentUser?.full_name) {
      return `${pageTitle} - ${currentUser.full_name} | MesaPra2`;
    }
    return `${pageTitle} | MesaPra2 - Jantares Sociais`;
  };

  // Gerar descrição dinâmica
  const generateDescription = () => {
    const baseDesc = "Gerencie seus eventos, participações e configurações no MesaPra2.";
    
    if (stats?.totalEvents) {
      return `${baseDesc} Você já criou ${stats.totalEvents} eventos e participou de ${stats.totalParticipations || 0} jantares sociais.`;
    }
    
    if (currentUser?.full_name) {
      return `Dashboard pessoal de ${currentUser.full_name}. ${baseDesc}`;
    }
    
    return `${baseDesc} Conecte-se com pessoas através de experiências gastronômicas únicas.`;
  };

  // Schema específico para dashboard
  const dashboardSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": generateTitle(),
    "description": generateDescription(),
    "url": window.location.href,
    "mainEntity": {
      "@type": "ProfilePage",
      "mainEntity": currentUser ? {
        "@type": "Person",
        "name": currentUser.full_name || "Usuário MesaPra2",
        "memberOf": {
          "@type": "Organization",
          "name": "MesaPra2"
        }
      } : undefined
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
  };

  return (
    <>
      <Helmet>
        {/* Título da página */}
        <title>{generateTitle()}</title>
        
        {/* Meta tags básicas */}
        <meta name="description" content={generateDescription()} />
        <meta name="keywords" content="dashboard, perfil, eventos gastronômicos, jantares sociais, mesapra2, gerenciar eventos, participações" />
        <meta name="author" content="MesaPra2" />
        <meta name="robots" content="noindex, nofollow" /> {/* Dashboard é área privada */}
        
        {/* Open Graph */}
        <meta property="og:title" content={generateTitle()} />
        <meta property="og:description" content={generateDescription()} />
        <meta property="og:type" content="profile" />
        <meta property="og:url" content={window.location.href} />
        <meta property="og:image" content={`${window.location.origin}/og-dashboard.jpg`} />
        <meta property="og:site_name" content="MesaPra2" />
        <meta property="og:locale" content="pt_BR" />
        
        {/* Twitter Cards */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={generateTitle()} />
        <meta name="twitter:description" content={generateDescription()} />
        <meta name="twitter:image" content={`${window.location.origin}/og-dashboard.jpg`} />
        
        {/* Canonical URL */}
        <link rel="canonical" href={window.location.href} />
        
        {/* Preconnect para performance */}
        <link rel="preconnect" href="https://ksmnfhenhppasfcikefd.supabase.co" />
        <link rel="dns-prefetch" href="https://ksmnfhenhppasfcikefd.supabase.co" />
        
        {/* Dados Estruturados */}
        <script type="application/ld+json">
          {JSON.stringify(dashboardSchema, null, 2)}
        </script>
      </Helmet>
      
      {/* Componente de dados estruturados adicional */}
      <StructuredData 
        type="dashboard" 
        page="dashboard" 
        user={currentUser}
      />
    </>
  );
};

export default SEODashboard;