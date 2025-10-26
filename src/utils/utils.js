import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { supabase } from "@/lib/supabaseClient" // <-- Adicione esta linha

// Função original (perfeita)
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/**
 * Gera a URL pública de uma foto do Supabase Storage.
 * @param {string} photoPath - O caminho/nome do arquivo no bucket.
 * @returns {string | null} - A URL pública ou null.
 */
export const getPhotoUrl = (photoPath) => {
  if (!photoPath) return null;
  
  // Se já for uma URL completa (ex: de um upload anterior ou cache)
  if (photoPath.startsWith('http')) return photoPath;

  const { data } = supabase.storage
    .from('photos') // Certifique-se que 'photos' é o nome do seu bucket
    .getPublicUrl(photoPath);
  
  return data.publicUrl;
};

/**
 * Comprime um arquivo de imagem antes do upload.
 * Redimensiona para no máximo 1920px e tenta manter abaixo de 2MB.
 * @param {File} file - O arquivo de imagem original.
 * @returns {Promise<File>} - O arquivo de imagem comprimido (como File).
 */
export const compressImage = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onerror = (error) => reject(error);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;

      img.onerror = (error) => reject(error);

      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Define o tamanho máximo
        const MAX_SIZE = 1920;
        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Tenta comprimir a imagem, ajustando a qualidade
        let quality = 0.9; // Começa com 90%
        let compressedDataUrl = canvas.toDataURL('image/jpeg', quality);

        // Tenta reduzir a qualidade se a imagem ainda for muito grande (ex: > 2MB)
        // O limite de 2MB é arbitrário, ajuste se necessário.
        while (compressedDataUrl.length > 2 * 1024 * 1024 && quality > 0.1) {
          quality -= 0.1;
          compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        // Converte de dataURL para Blob e depois para File
        fetch(compressedDataUrl)
          .then(res => res.blob())
          .then(blob => {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve(compressedFile);
          })
          .catch(reject);
      };
    };
  });
};