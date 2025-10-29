// backend/utils/codeGenerator.js

/**
 * Gera um código de verificação numérico de 6 dígitos
 * @returns {string} - Código de 6 dígitos
 */
exports.generateVerificationCode = () => {
  // Gera número aleatório entre 100000 e 999999
  const code = Math.floor(100000 + Math.random() * 900000);
  return code.toString();
};

/**
 * Valida formato do código de verificação
 * @param {string} code - Código a ser validado
 * @returns {boolean}
 */
exports.isValidVerificationCode = (code) => {
  return /^\d{6}$/.test(code);
};

/**
 * Valida formato de telefone brasileiro
 * @param {string} phone - Telefone no formato +5511999999999
 * @returns {boolean}
 */
exports.isValidBrazilianPhone = (phone) => {
  // Formato: +55 + DDD (2 dígitos) + número (9 dígitos)
  return /^\+55\d{11}$/.test(phone.replace(/\D/g, ''));
};