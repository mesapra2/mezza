# 📸 Integração com Instagram

## Funcionalidade Implementada

A integração com Instagram permite que os usuários:

1. **Conectem sua conta Instagram** via OAuth
2. **Visualizem suas fotos** do Instagram no app
3. **Importem fotos** diretamente para o perfil
4. **Gerenciem a conexão** (conectar/desconectar)

## Arquivos Criados/Modificados

### Novos Arquivos
- `src/features/shared/components/profile/InstagramIntegration.jsx` - Componente principal
- `src/features/shared/pages/InstagramCallbackPage.jsx` - Página de callback OAuth
- `supabase/migrations/add_instagram_fields_to_profiles.sql` - Migração do banco

### Arquivos Modificados
- `src/features/shared/pages/ProfilePage.jsx` - Adicionada integração
- `src/services/InstagramService.js` - Corrigido bucket de storage
- `src/App.jsx` - Adicionada rota de callback

## Como Usar

### 1. Na Página de Perfil
- Vá para a seção "Galeria de Fotos"
- Encontre a seção "Instagram Conectado" ou "Conectar Instagram"
- Clique no botão de conexão para autorizar via OAuth

### 2. Conectar Instagram
- Clique no ícone de link externo
- Será redirecionado para o Instagram
- Autorize as permissões solicitadas
- Será redirecionado de volta para o app

### 3. Importar Fotos
- Após conectado, clique no ícone de download
- Visualize suas fotos do Instagram
- Clique no botão de download em cada foto para importar

## Configuração Necessária

### 1. Supabase Dashboard
Configure o Instagram como provider OAuth:

```sql
-- Executar a migração
\i supabase/migrations/add_instagram_fields_to_profiles.sql
```

### 2. Instagram Developer
1. Crie um app no [Facebook for Developers](https://developers.facebook.com/)
2. Adicione o produto "Instagram Basic Display"
3. Configure as URLs de redirect:
   - `https://seuapp.com/auth/instagram-callback`
   - Para desenvolvimento: `http://localhost:3000/auth/instagram-callback`

### 3. Variáveis de Ambiente
No Supabase Dashboard > Authentication > Settings:
- **Instagram Client ID**: Seu App ID
- **Instagram Client Secret**: Seu App Secret
- **Redirect URL**: `https://seuapp.com/auth/instagram-callback`

## Estrutura de Dados

### Tabela `profiles`
```sql
-- Campos adicionados
instagram_token TEXT,          -- Token OAuth para API calls
instagram_user_id TEXT,        -- ID único do usuário no Instagram  
instagram_username TEXT,       -- Username (@usuario)
instagram_connected_at TIMESTAMPTZ -- Data da última conexão
```

## Funcionalidades do Componente

### `InstagramIntegration.jsx`
```jsx
<InstagramIntegration
  userId={user?.id}                    // ID do usuário logado
  onPhotoImport={handleImportCallback} // Callback quando foto é importada
  availableSlots={3 - photos.length}   // Slots disponíveis para fotos
  disabled={uploading || saving}       // Desabilitar durante uploads
/>
```

### Props
- `userId`: ID do usuário para salvar dados
- `onPhotoImport`: Função chamada quando foto é importada
- `availableSlots`: Número de slots de foto disponíveis
- `disabled`: Se o componente deve estar desabilitado

## API do Instagram Utilizada

### Endpoints
1. **OAuth**: `https://api.instagram.com/oauth/authorize`
2. **User Media**: `https://graph.instagram.com/me/media`
3. **Media Details**: `https://graph.instagram.com/me/media?fields=id,media_type,media_url`

### Permissões Solicitadas
- `user_profile`: Informações básicas do perfil
- `user_media`: Acesso às mídias do usuário

## Tratamento de Erros

### Erros Comuns
1. **Token Expirado**: Automaticamente desconecta e solicita nova conexão
2. **Sem Fotos**: Mostra mensagem apropriada
3. **Limite de Fotos**: Desabilita importação quando limite atingido
4. **Falha no Upload**: Mostra erro específico ao usuário

### Estados de Loading
- Loading inicial ao verificar conexão
- Loading ao buscar fotos do Instagram
- Loading individual por foto durante importação

## Segurança

### Armazenamento de Tokens
- Tokens são armazenados criptografados no Supabase
- RLS (Row Level Security) protege acesso aos dados
- Tokens são validados antes de uso

### Validações
- Verificação de usuário logado
- Verificação de permissões do token
- Limpeza automática de tokens expirados

## Estilo Visual

### Design System
- Usa o mesmo design das outras seções
- Gradientes e cores consistentes com o tema
- Animações suaves com Framer Motion
- Responsivo para mobile e desktop

### Estados Visuais
- **Não Conectado**: Botão de conexão com Instagram
- **Conectado**: Username e data de conexão
- **Carregando Fotos**: Grid de skeleton
- **Fotos Carregadas**: Grid interativo com hover effects

## Exemplo de Uso Completo

```jsx
// Na ProfilePage.jsx
import InstagramIntegration from '@/features/shared/components/profile/InstagramIntegration';

const handleInstagramPhotoImport = async (photoPath) => {
  // Adicionar foto ao estado local
  const updatedPhotos = [...photos, photoPath];
  setPhotos(updatedPhotos);
  
  // Atualizar cache de URLs
  const url = getPublicPhotoUrl(photoPath);
  setPhotoUrls(prev => ({...prev, [photoPath]: url}));
  
  // Mostrar feedback ao usuário
  toast({title: "Foto importada!", description: "Salve as alterações"});
};

// No JSX
<InstagramIntegration
  userId={user?.id}
  onPhotoImport={handleInstagramPhotoImport}
  availableSlots={3 - photos.length}
  disabled={uploading || saving}
/>
```

## Próximos Passos

### Melhorias Futuras
1. **Cache de Fotos**: Armazenar thumbnails localmente
2. **Sync Automático**: Verificar novas fotos periodicamente  
3. **Filtros**: Permitir filtrar por data/tipo
4. **Múltipla Seleção**: Importar várias fotos de uma vez
5. **Stories**: Suporte para Instagram Stories

### Monitoramento
1. Logs de uso da integração
2. Métricas de importação de fotos
3. Taxa de erro de tokens expirados