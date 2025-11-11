// src/utils/validateCNPJ.js
import { supabase } from '@/lib/supabaseClient';

/**
 * Valida o formato do CNPJ (XX.XXX.XXX/XXXX-XX)
 */
export const formatCNPJ = (value) => {
  // Remove tudo que não é número
  const numbers = value.replace(/\D/g, '');
  
  // Aplica a máscara
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 5) return `${numbers.slice(0, 2)}.${numbers.slice(2)}`;
  if (numbers.length <= 8) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5)}`;
  if (numbers.length <= 12) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8)}`;
  return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12, 14)}`;
};

/**
 * Remove formatação do CNPJ
 */
export const cleanCNPJ = (cnpj) => {
  return cnpj.replace(/\D/g, '');
};

/**
 * Valida se o CNPJ está no formato correto
 */
export const isValidCNPJFormat = (cnpj) => {
  const cleaned = cleanCNPJ(cnpj);
  return cleaned.length === 14;
};

/**
 * Valida o dígito verificador do CNPJ (algoritmo oficial)
 */
export const isValidCNPJ = (cnpj) => {
  const cleaned = cleanCNPJ(cnpj);
  
  if (cleaned.length !== 14) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(cleaned)) return false;
  
  // Validação do primeiro dígito
  let sum = 0;
  let weight = 5;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleaned[i]) * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }
  let digit1 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  
  if (parseInt(cleaned[12]) !== digit1) return false;
  
  // Validação do segundo dígito
  sum = 0;
  weight = 6;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleaned[i]) * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }
  let digit2 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  
  return parseInt(cleaned[13]) === digit2;
};

/**
 * Verifica se o CNPJ já existe no banco de dados
 */
export const checkCNPJExists = async (cnpj) => {
  try {
    const cleaned = cleanCNPJ(cnpj);
    
    const { data, error } = await supabase
      .from('partners')
      .select('id, name')
      .eq('cnpj', cleaned)
      .maybeSingle();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Erro ao verificar CNPJ:', error);
      return { exists: false, error: error.message };
    }
    
    return {
      exists: data !== null,
      partner: data,
      error: null
    };
  } catch (error) {
    console.error('Erro ao verificar CNPJ:', error);
    return { exists: false, error: error.message };
  }
};

/**
 * Validação completa do CNPJ (formato + BD)
 */
export const validateCNPJComplete = async (cnpj) => {
  // 1. Verifica formato
  if (!isValidCNPJFormat(cnpj)) {
    return {
      valid: false,
      error: 'CNPJ deve ter 14 dígitos'
    };
  }
  
  // 2. Valida dígito verificador
  if (!isValidCNPJ(cnpj)) {
    return {
      valid: false,
      error: 'CNPJ inválido'
    };
  }
  
  // 3. Verifica se já existe no BD
  const { exists, partner, error } = await checkCNPJExists(cnpj);
  
  if (error) {
    return {
      valid: false,
      error: 'Erro ao verificar CNPJ no banco de dados'
    };
  }
  
  if (exists) {
    return {
      valid: false,
      error: `Este CNPJ já está cadastrado para ${partner.name}`
    };
  }
  
  return {
    valid: true,
    error: null
  };
};