/**
 * ========================================
 * CORREÇÃO AUTOMÁTICA DE PERMISSÕES DO STORAGE
 * ========================================
 * 
 * Utilitário para verificar e corrigir permissões do storage automaticamente
 */

import { supabase } from '@/lib/supabaseClient';

/**
 * Verifica se o bucket avatars está configurado como público
 * @returns {Promise<boolean>}
 */
export const checkBucketPublicAccess = async () => {
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error('❌ Erro ao listar buckets:', error);
      return false;
    }

    const avatarsBucket = buckets.find(bucket => bucket.id === 'avatars');
    
    if (!avatarsBucket) {
      console.warn('⚠️ Bucket avatars não encontrado');
      return false;
    }

    console.log('📁 Status do bucket avatars:', avatarsBucket);
    return avatarsBucket.public === true;
  } catch (error) {
    console.error('❌ Erro ao verificar bucket:', error);
    return false;
  }
};

/**
 * Tenta corrigir o bucket para público via API
 * @returns {Promise<boolean>}
 */
export const tryFixBucketPublic = async () => {
  try {
    // Tentar atualizar bucket para público
    const { error } = await supabase.storage.updateBucket('avatars', {
      public: true
    });

    if (error) {
      console.warn('⚠️ Não foi possível atualizar bucket automaticamente:', error.message);
      return false;
    }

    console.log('✅ Bucket avatars configurado como público');
    return true;
  } catch (error) {
    console.error('❌ Erro ao atualizar bucket:', error);
    return false;
  }
};

/**
 * Testa se uma URL de foto é acessível publicamente
 * @param {string} photoPath 
 * @returns {Promise<boolean>}
 */
export const testPhotoAccess = async (photoPath) => {
  try {
    const { data } = supabase.storage.from('avatars').getPublicUrl(photoPath);
    const url = data.publicUrl;

    // Fazer requisição HEAD para testar acesso
    const response = await fetch(url, { method: 'HEAD' });
    
    if (response.ok) {
      console.log('✅ Foto acessível publicamente:', url);
      return true;
    } else {
      console.warn('❌ Foto não acessível:', response.status, url);
      return false;
    }
  } catch (error) {
    console.error('❌ Erro ao testar acesso à foto:', error);
    return false;
  }
};

/**
 * Diagnóstico completo do storage
 * @param {string} photoPath 
 * @returns {Promise<Object>}
 */
export const diagnoseStorageIssue = async (photoPath) => {
  console.log('🔍 Iniciando diagnóstico do storage para:', photoPath);
  
  const diagnosis = {
    bucketExists: false,
    bucketPublic: false,
    fileExists: false,
    fileAccessible: false,
    recommendations: []
  };

  try {
    // 1. Verificar se bucket existe e é público
    const { data: buckets } = await supabase.storage.listBuckets();
    const avatarsBucket = buckets?.find(b => b.id === 'avatars');
    
    diagnosis.bucketExists = !!avatarsBucket;
    diagnosis.bucketPublic = avatarsBucket?.public === true;

    if (!diagnosis.bucketExists) {
      diagnosis.recommendations.push('Criar bucket "avatars"');
      return diagnosis;
    }

    if (!diagnosis.bucketPublic) {
      diagnosis.recommendations.push('Configurar bucket "avatars" como público');
    }

    // 2. Verificar se arquivo existe
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('avatars')
      .download(photoPath);

    diagnosis.fileExists = !downloadError && !!fileData;

    if (!diagnosis.fileExists) {
      diagnosis.recommendations.push('Arquivo não existe no storage - reenviar foto');
      return diagnosis;
    }

    // 3. Testar acesso público
    diagnosis.fileAccessible = await testPhotoAccess(photoPath);

    if (!diagnosis.fileAccessible) {
      diagnosis.recommendations.push('Configurar políticas RLS para acesso público');
    }

  } catch (error) {
    console.error('❌ Erro no diagnóstico:', error);
    diagnosis.recommendations.push('Erro no diagnóstico - verificar conexão');
  }

  return diagnosis;
};

/**
 * Função principal para corrigir problemas de storage automaticamente
 * @param {string} photoPath 
 * @returns {Promise<boolean>}
 */
export const autoFixStoragePermissions = async (photoPath) => {
  console.log('🔧 Iniciando correção automática para:', photoPath);

  const diagnosis = await diagnoseStorageIssue(photoPath);
  console.log('📋 Diagnóstico:', diagnosis);

  let fixed = true;

  // Tentar corrigir bucket público
  if (!diagnosis.bucketPublic) {
    console.log('🔄 Tentando corrigir bucket público...');
    const bucketFixed = await tryFixBucketPublic();
    if (!bucketFixed) {
      fixed = false;
    }
  }

  // Se ainda há problemas, mostrar instruções
  if (diagnosis.recommendations.length > 0) {
    console.warn('⚠️ Ações necessárias:', diagnosis.recommendations);
    
    if (!diagnosis.bucketPublic) {
      console.log(`
🛠️ CORREÇÃO MANUAL NECESSÁRIA:

1. Acesse o Supabase Dashboard
2. Vá para Storage > avatars
3. Clique no ícone de configurações
4. Marque "Public bucket" 
5. Salve as alterações

OU execute no SQL Editor:

UPDATE storage.buckets 
SET public = true 
WHERE id = 'avatars';
      `);
    }

    return false;
  }

  console.log('✅ Storage configurado corretamente');
  return fixed;
};

export default {
  checkBucketPublicAccess,
  tryFixBucketPublic,
  testPhotoAccess,
  diagnoseStorageIssue,
  autoFixStoragePermissions
};