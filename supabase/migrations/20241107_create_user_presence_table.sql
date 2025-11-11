-- Criar tabela user_presence para tracking de usuários online
CREATE TABLE IF NOT EXISTS user_presence (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('online', 'away', 'offline')) DEFAULT 'offline',
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionar índices para performance
CREATE INDEX IF NOT EXISTS idx_user_presence_status ON user_presence(status);
CREATE INDEX IF NOT EXISTS idx_user_presence_last_seen ON user_presence(last_seen);
CREATE INDEX IF NOT EXISTS idx_user_presence_updated_at ON user_presence(updated_at);

-- Configurar RLS (Row Level Security)
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

-- Política para permitir usuários visualizarem presença de outros usuários
CREATE POLICY "Users can view presence" ON user_presence
    FOR SELECT USING (true);

-- Política para permitir usuários atualizarem sua própria presença
CREATE POLICY "Users can update own presence" ON user_presence
    FOR ALL USING (auth.uid() = user_id);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_user_presence_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE TRIGGER trigger_update_user_presence_updated_at
    BEFORE UPDATE ON user_presence
    FOR EACH ROW
    EXECUTE FUNCTION update_user_presence_updated_at();

-- Comentários para documentação
COMMENT ON TABLE user_presence IS 'Tabela para tracking de presença online dos usuários';
COMMENT ON COLUMN user_presence.user_id IS 'ID do usuário (referência para auth.users)';
COMMENT ON COLUMN user_presence.status IS 'Status de presença: online, away, offline';
COMMENT ON COLUMN user_presence.last_seen IS 'Última vez que o usuário foi visto online';
COMMENT ON COLUMN user_presence.updated_at IS 'Timestamp da última atualização';