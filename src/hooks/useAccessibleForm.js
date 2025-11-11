// src/hooks/useAccessibleForm.js
import { useId } from 'react';

/**
 * Hook personalizado para gerar IDs únicos e props de acessibilidade para formulários
 * Garante que campos tenham labels, descrições e validações adequadas
 */
export const useAccessibleForm = () => {
  const formId = useId();
  const errorId = useId();
  const descriptionId = useId();
  
  /**
   * Gera props de acessibilidade para um campo de formulário
   * @param {string} fieldName - Nome do campo
   * @param {Object} options - Opções do campo
   * @param {string} options.error - Mensagem de erro
   * @param {string} options.description - Descrição do campo
   * @param {boolean} options.required - Se o campo é obrigatório
   * @returns {Object} Props de acessibilidade para o campo
   */
  const getFieldProps = (fieldName, { error, description, required } = {}) => ({
    id: `${formId}-${fieldName}`,
    'aria-invalid': error ? 'true' : 'false',
    'aria-describedby': [
      error && `${errorId}-${fieldName}`,
      description && `${descriptionId}-${fieldName}`
    ].filter(Boolean).join(' ') || undefined,
    'aria-required': required ? 'true' : undefined,
  });

  /**
   * Gera ID para mensagem de erro
   * @param {string} fieldName - Nome do campo
   * @returns {string} ID da mensagem de erro
   */
  const getErrorId = (fieldName) => `${errorId}-${fieldName}`;

  /**
   * Gera ID para descrição do campo
   * @param {string} fieldName - Nome do campo  
   * @returns {string} ID da descrição
   */
  const getDescriptionId = (fieldName) => `${descriptionId}-${fieldName}`;

  /**
   * Gera props para label associado ao campo
   * @param {string} fieldName - Nome do campo
   * @returns {Object} Props do label
   */
  const getLabelProps = (fieldName) => ({
    htmlFor: `${formId}-${fieldName}`,
  });

  return {
    getFieldProps,
    getErrorId,
    getDescriptionId,
    getLabelProps,
    formId,
  };
};

export default useAccessibleForm;