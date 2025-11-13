-- Criar tabela de notificações
CREATE TABLE IF NOT EXISTS public.notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_id BIGINT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    participation_id UUID NULL,
    notification_type TEXT NOT NULL,
    title TEXT,
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    sent BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_event_id ON public.notifications(event_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(notification_type);

-- Habilitar RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - usuários só podem ver suas próprias notificações
CREATE POLICY "Usuários podem ver apenas suas próprias notificações"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar notificações para si mesmos"
    ON public.notifications FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias notificações"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar suas próprias notificações"
    ON public.notifications FOR DELETE
    USING (auth.uid() = user_id);

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_notifications_updated_at ON public.notifications;
CREATE TRIGGER update_notifications_updated_at 
    BEFORE UPDATE ON public.notifications 
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_notifications_updated_at();

-- Função para limpar notificações antigas (opcional)
CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS void AS $$
BEGIN
    -- Deletar notificações lidas com mais de 30 dias
    DELETE FROM public.notifications 
    WHERE is_read = true 
    AND created_at < NOW() - INTERVAL '30 days';
    
    -- Deletar notificações não lidas com mais de 90 dias
    DELETE FROM public.notifications 
    WHERE is_read = false 
    AND created_at < NOW() - INTERVAL '90 days';
END;
$$ language 'plpgsql';

COMMENT ON TABLE public.notifications IS 'Tabela para armazenar notificações dos usuários';
COMMENT ON COLUMN public.notifications.notification_type IS 'Tipo da notificação (event_application, participation_request, etc.)';
COMMENT ON COLUMN public.notifications.is_read IS 'Se a notificação foi lida pelo usuário';
COMMENT ON COLUMN public.notifications.sent IS 'Se a notificação foi enviada (para controle de envio)';