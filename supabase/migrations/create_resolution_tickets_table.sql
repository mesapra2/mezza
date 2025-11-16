-- Migration: Create resolution_tickets table
-- Description: Sistema de tickets para resolução de conflitos e moderação

-- Criar tabela de tickets de resolution
CREATE TABLE IF NOT EXISTS resolution_tickets (
    id BIGSERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL CHECK (type IN ('user_disapproval', 'behavior_issue', 'identity_concern', 'accidental_approval')),
    priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'escalated')),
    
    -- Relacionamentos
    event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    affected_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Conteúdo do ticket
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    evidence JSONB DEFAULT '{}', -- Chat logs, screenshots, etc.
    
    -- Administração
    admin_notes TEXT,
    resolution TEXT,
    resolved_by UUID REFERENCES profiles(id),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT valid_resolution CHECK (
        (status = 'resolved' AND resolution IS NOT NULL AND resolved_at IS NOT NULL) OR 
        (status != 'resolved')
    )
);

-- Índices para performance
CREATE INDEX idx_resolution_tickets_event_id ON resolution_tickets(event_id);
CREATE INDEX idx_resolution_tickets_reporter_id ON resolution_tickets(reporter_id);
CREATE INDEX idx_resolution_tickets_affected_user_id ON resolution_tickets(affected_user_id);
CREATE INDEX idx_resolution_tickets_status ON resolution_tickets(status);
CREATE INDEX idx_resolution_tickets_priority ON resolution_tickets(priority);
CREATE INDEX idx_resolution_tickets_type ON resolution_tickets(type);
CREATE INDEX idx_resolution_tickets_created_at ON resolution_tickets(created_at DESC);

-- Atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_resolution_tickets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_resolution_tickets_updated_at
    BEFORE UPDATE ON resolution_tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_resolution_tickets_updated_at();

-- Adicionar colunas à tabela event_participants para rastreamento de desaprovação
ALTER TABLE event_participants 
ADD COLUMN IF NOT EXISTS rejection_reason VARCHAR(50),
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES profiles(id);

-- Índices para as novas colunas
CREATE INDEX IF NOT EXISTS idx_event_participants_rejection_reason ON event_participants(rejection_reason);
CREATE INDEX IF NOT EXISTS idx_event_participants_rejected_at ON event_participants(rejected_at);
CREATE INDEX IF NOT EXISTS idx_event_participants_rejected_by ON event_participants(rejected_by);

-- RLS (Row Level Security) para resolution_tickets
ALTER TABLE resolution_tickets ENABLE ROW LEVEL SECURITY;

-- Policy para administradores (assumindo que há um campo role em profiles)
CREATE POLICY "Admins can manage all resolution tickets" ON resolution_tickets
    FOR ALL USING (
        auth.uid() IN (
            SELECT id FROM profiles WHERE role = 'admin'
        )
    );

-- Policy para criadores de tickets (podem ver seus próprios tickets)
CREATE POLICY "Users can view their own tickets" ON resolution_tickets
    FOR SELECT USING (
        auth.uid() = reporter_id OR auth.uid() = affected_user_id
    );

-- Policy para criação de tickets (usuários logados podem criar)
CREATE POLICY "Authenticated users can create tickets" ON resolution_tickets
    FOR INSERT WITH CHECK (
        auth.uid() = reporter_id AND
        auth.uid() IS NOT NULL
    );

-- Comentários para documentação
COMMENT ON TABLE resolution_tickets IS 'Sistema de tickets para resolução de conflitos e moderação';
COMMENT ON COLUMN resolution_tickets.type IS 'Tipo do ticket: user_disapproval, behavior_issue, identity_concern, accidental_approval';
COMMENT ON COLUMN resolution_tickets.priority IS 'Prioridade: low, medium, high, urgent';
COMMENT ON COLUMN resolution_tickets.status IS 'Status: pending, in_progress, resolved, escalated';
COMMENT ON COLUMN resolution_tickets.evidence IS 'Evidências em JSON: chat logs, screenshots, etc.';
COMMENT ON COLUMN event_participants.rejection_reason IS 'Motivo da desaprovação: behavior_chat, identity_mismatch, accidental_approval';
COMMENT ON COLUMN event_participants.rejected_at IS 'Timestamp de quando foi rejeitado/desaprovado';
COMMENT ON COLUMN event_participants.rejected_by IS 'ID do usuário que rejeitou/desaprovou';