// src/utils/index.js

import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { supabase } from '@/lib/supabaseClient';

/**
 * Combina classes CSS com Tailwind merge
 * Função essencial para componentes shadcn/ui
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Comprime uma imagem para um tamanho máximo
 * @param {File} file - Arquivo de imagem
 * @param {number} maxSizeMB - Tamanho máximo em MB (padrão: 2MB)
 * @param {number} maxWidthOrHeight - Largura/altura máxima (padrão: 1920px)
 * @returns {Promise<File>} - Arquivo comprimido
 */
export async function compressImage(file, maxSizeMB = 2, maxWidthOrHeight = 1920) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Redimensiona mantendo proporção
        if (width > height) {
          if (width > maxWidthOrHeight) {
            height *= maxWidthOrHeight / width;
            width = maxWidthOrHeight;
          }
        } else {
          if (height > maxWidthOrHeight) {
            width *= maxWidthOrHeight / height;
            height = maxWidthOrHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Converte para blob com qualidade ajustada
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Falha ao comprimir imagem'));
              return;
            }

            // Se ainda estiver maior que o limite, reduz a qualidade
            if (blob.size > maxSizeMB * 1024 * 1024) {
              canvas.toBlob(
                (blob2) => {
                  if (!blob2) {
                    reject(new Error('Falha ao comprimir imagem'));
                    return;
                  }
                  const compressedFile = new File([blob2], file.name, {
                    type: 'image/jpeg',
                    lastModified: Date.now(),
                  });
                  resolve(compressedFile);
                },
                'image/jpeg',
                0.7 // Qualidade reduzida
              );
            } else {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            }
          },
          'image/jpeg',
          0.9 // Qualidade inicial
        );
      };

      img.onerror = () => {
        reject(new Error('Falha ao carregar imagem'));
      };

      img.src = event.target.result;
    };

    reader.onerror = () => {
      reject(new Error('Falha ao ler arquivo'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Obtém a URL pública de uma foto do Supabase Storage
 * @param {string} photoPath - Caminho da foto no storage
 * @param {string} bucket - Nome do bucket (padrão: 'photos')
 * @returns {string|null} - URL pública da foto ou null
 */
export function getPhotoUrl(photoPath, bucket = 'photos') {
  if (!photoPath) return null;

  // Se já for uma URL completa, retorna ela mesma
  if (photoPath.startsWith('http://') || photoPath.startsWith('https://')) {
    return photoPath;
  }

  try {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(photoPath);

    return data?.publicUrl || null;
  } catch (error) {
    console.error('Erro ao obter URL da foto:', error);
    return null;
  }
}

/**
 * Obtém a URL pública de um avatar do Supabase Storage
 * @param {string} avatarPath - Caminho do avatar no storage
 * @returns {string|null} - URL pública do avatar ou null
 */
export function getAvatarUrl(avatarPath) {
  return getPhotoUrl(avatarPath, 'avatars');
}

/**
 * Formata um número de telefone brasileiro
 * @param {string} phone - Número de telefone
 * @returns {string} - Telefone formatado
 */
export function formatPhone(phone) {
  if (!phone) return '';
  
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  } else if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  
  return phone;
}

/**
 * Formata um CNPJ
 * @param {string} cnpj - CNPJ
 * @returns {string} - CNPJ formatado
 */
export function formatCNPJ(cnpj) {
  if (!cnpj) return '';
  
  const cleaned = cnpj.replace(/\D/g, '');
  
  if (cleaned.length === 14) {
    return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  
  return cnpj;
}

/**
 * Formata um CEP
 * @param {string} cep - CEP
 * @returns {string} - CEP formatado
 */
export function formatCEP(cep) {
  if (!cep) return '';
  
  const cleaned = cep.replace(/\D/g, '');
  
  if (cleaned.length === 8) {
    return cleaned.replace(/(\d{5})(\d{3})/, '$1-$2');
  }
  
  return cep;
}

/**
 * Formata uma data para exibição
 * @param {string|Date} date - Data
 * @param {boolean} includeTime - Incluir hora (padrão: false)
 * @returns {string} - Data formatada
 */
export function formatDate(date, includeTime = false) {
  if (!date) return '';
  
  const d = new Date(date);
  
  if (isNaN(d.getTime())) return '';
  
  const options = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  };
  
  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }
  
  return d.toLocaleString('pt-BR', options);
}

/**
 * Trunca um texto com reticências
 * @param {string} text - Texto
 * @param {number} maxLength - Comprimento máximo
 * @returns {string} - Texto truncado
 */
export function truncate(text, maxLength = 100) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  
  return text.substring(0, maxLength) + '...';
}

/**
 * Valida um email
 * @param {string} email - Email
 * @returns {boolean} - True se válido
 */
export function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

/**
 * Valida um CNPJ
 * @param {string} cnpj - CNPJ
 * @returns {boolean} - True se válido
 */
export function isValidCNPJ(cnpj) {
  const cleaned = cnpj.replace(/\D/g, '');
  
  if (cleaned.length !== 14) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(cleaned)) return false;
  
  // Validação dos dígitos verificadores
  let length = cleaned.length - 2;
  let numbers = cleaned.substring(0, length);
  const digits = cleaned.substring(length);
  let sum = 0;
  let pos = length - 7;
  
  for (let i = length; i >= 1; i--) {
    sum += numbers.charAt(length - i) * pos--;
    if (pos < 2) pos = 9;
  }
  
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result != digits.charAt(0)) return false;
  
  length = length + 1;
  numbers = cleaned.substring(0, length);
  sum = 0;
  pos = length - 7;
  
  for (let i = length; i >= 1; i--) {
    sum += numbers.charAt(length - i) * pos--;
    if (pos < 2) pos = 9;
  }
  
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result != digits.charAt(1)) return false;
  
  return true;
}

/**
 * Debounce de uma função
 * @param {Function} func - Função a ser debounced
 * @param {number} wait - Tempo de espera em ms
 * @returns {Function} - Função debounced
 */
export function debounce(func, wait = 300) {
  let timeout;
  
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Gera um slug a partir de um texto
 * @param {string} text - Texto
 * @returns {string} - Slug
 */
export function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

/**
 * Calcula a distância entre duas coordenadas (em km)
 * @param {number} lat1 - Latitude 1
 * @param {number} lon1 - Longitude 1
 * @param {number} lat2 - Latitude 2
 * @param {number} lon2 - Longitude 2
 * @returns {number} - Distância em km
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Raio da Terra em km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}