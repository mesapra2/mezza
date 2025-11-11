// migrate.js
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'SUA_URL_AQUI';
const SUPABASE_SERVICE_KEY = 'SUA_SERVICE_KEY_AQUI'; // Precisa de service_role key!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function migrate() {
  console.log('Iniciando migração...');
  
  // Busca partners com fotos no bucket 'photos'
  const { data: partners } = await supabase
    .from('partners')
    .select('id, name, avatar_url, gallery_photos')
    .not('avatar_url', 'is', null);
  
  console.log(`Encontrados ${partners.length} partners`);
  
  // Aqui você implementaria a lógica de copiar arquivos
  // ...
}

migrate();