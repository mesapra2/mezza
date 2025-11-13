-- Criar tabela de sugestões de cardápio inteligente
CREATE TABLE IF NOT EXISTS public.menu_suggestions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    difficulty VARCHAR(20) CHECK (difficulty IN ('facil', 'medio', 'elaborado')) DEFAULT 'facil',
    
    -- Pratos
    appetizer VARCHAR(200),
    main_course VARCHAR(200),
    dessert VARCHAR(200),
    
    -- Imagem
    image_url TEXT,
    
    -- Hashtags compatíveis
    compatible_hashtags TEXT[] NOT NULL,
    
    -- Categoria do cardápio
    category VARCHAR(50), -- "boteco", "gourmet", "vegano", etc.
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_menu_suggestions_hashtags ON public.menu_suggestions USING GIN(compatible_hashtags);
CREATE INDEX IF NOT EXISTS idx_menu_suggestions_difficulty ON public.menu_suggestions(difficulty);
CREATE INDEX IF NOT EXISTS idx_menu_suggestions_category ON public.menu_suggestions(category);

-- Habilitar RLS
ALTER TABLE public.menu_suggestions ENABLE ROW LEVEL SECURITY;

-- Política para leitura (todos podem ver)
CREATE POLICY "menu_suggestions_read" ON public.menu_suggestions 
    FOR SELECT USING (true);

-- Inserir dados iniciais
INSERT INTO public.menu_suggestions (name, description, difficulty, appetizer, main_course, dessert, image_url, compatible_hashtags, category) VALUES
    ('Boteco Brasileiro', 'Cardápio descontraído para encontros casuais com cerveja', 'facil', 'Pastel de carne e queijo', 'Feijoada completa com acompanhamentos', 'Pudim de leite condensado', '/cardapio/boteco.jpg', ARRAY['futebol', 'cerveja', 'descontraído', 'amigos', 'casual'], 'boteco'),
    
    ('Burger Artesanal', 'Hambúrgueres gourmet e acompanhamentos especiais', 'facil', 'Bruschetta de tomate', 'Hambúrguer artesanal com fritas rústicas', 'Brownie com sorvete', '/cardapio/burger.jpg', ARRAY['cerveja', 'descontraído', 'jovem', 'casual', 'amigos'], 'casual'),
    
    ('Tex-Mex Casual', 'Sabores mexicanos para compartilhar', 'medio', 'Nachos com guacamole', 'Tacos variados com molhos', 'Churros com doce de leite', '/cardapio/texmex.jpg', ARRAY['descontraído', 'picante', 'compartilhar', 'cerveja', 'jovem'], 'internacional'),
    
    ('Gourmet Sofisticado', 'Menu elaborado para ocasiões especiais', 'elaborado', 'Carpaccio de salmão', 'Risotto de cogumelos trufados', 'Petit gateau com frutas vermelhas', '/cardapio/gourmet.jpg', ARRAY['vinho', 'jazz', 'gourmet', 'sofisticado', 'romântico'], 'gourmet'),
    
    ('Vegano Saudável', 'Opções plant-based nutritivas e saborosas', 'medio', 'Bowl de quinoa e legumes', 'Curry de grão-de-bico com arroz integral', 'Mousse de abacate com cacau', '/cardapio/vegano.jpg', ARRAY['vegano', 'yoga', 'sustentabilidade', 'saudável', 'natureba'], 'vegano'),
    
    ('Italiano Clássico', 'Tradição italiana autêntica', 'medio', 'Antipasto misto', 'Pasta carbonara com salada caesar', 'Tiramisù caseiro', '/cardapio/italiano.jpg', ARRAY['vinho', 'família', 'tradição', 'massa', 'romântico'], 'italiano'),
    
    ('Japonês Contemporâneo', 'Fusão moderna da culinária japonesa', 'elaborado', 'Gyoza de legumes', 'Sushi variado com sashimi', 'Mochi de frutas', '/cardapio/japones.jpg', ARRAY['sushi', 'sofisticado', 'saudável', 'moderno', 'zen'], 'japones'),
    
    ('Churrasco Gaúcho', 'Carnes nobres e acompanhamentos tradicionais', 'facil', 'Provoleta grelhada', 'Picanha com farofa e vinagrete', 'Doce de mamão com queijo', '/cardapio/churrasco.jpg', ARRAY['futebol', 'churrasco', 'carne', 'família', 'tradição'], 'churrasco');

COMMENT ON TABLE public.menu_suggestions IS 'Sugestões de cardápio inteligente baseadas em hashtags';