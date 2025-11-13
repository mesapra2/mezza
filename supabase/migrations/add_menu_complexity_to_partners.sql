-- Adicionar campo menu_complexity à tabela partners
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'partners' AND column_name = 'menu_complexity'
    ) THEN
        ALTER TABLE public.partners 
        ADD COLUMN menu_complexity TEXT CHECK (menu_complexity IN ('fácil', 'normal', 'elaborado'));
        
        CREATE INDEX IF NOT EXISTS idx_partners_menu_complexity 
        ON public.partners(menu_complexity);
    END IF;
END $$;

COMMENT ON COLUMN public.partners.menu_complexity IS 'Complexidade do cardápio: fácil, normal ou elaborado';