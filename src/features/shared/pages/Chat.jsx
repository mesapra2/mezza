import React from 'react';
import { Helmet } from 'react-helmet-async';
import { toast } from '@/features/shared/components/ui/use-toast';

const Chat = () => {
  const handleAction = () => {
    toast({
      title: "🚧 Funcionalidade em desenvolvimento",
      description: "Esta feature ainda não está implementada—mas você pode solicitá-la no próximo prompt! 🚀",
    });
  };

  return (
    <>
      <Helmet>
        <title>Chat - Mesapra2</title>
        <meta name="description" content="Converse com outros participantes." />
      </Helmet>
      <div className="text-center py-20">
        <h1 className="text-3xl font-bold gradient-text mb-4">Chat</h1>
        <p className="text-white/60 mb-8">Página em construção</p>
        <button onClick={handleAction} className="px-6 py-3 bg-purple-500 rounded-lg">
          Testar Notificação
        </button>
      </div>
    </>
  );
};

export default Chat;