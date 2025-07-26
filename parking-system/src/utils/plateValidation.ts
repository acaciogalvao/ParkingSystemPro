// Utilitário para validação de placas brasileiras
// Suporta formatos antigo (ABC-1234) e Mercosul (ABC1A12)

export interface PlateValidationResult {
  isValid: boolean;
  type: string | null;
  error: string | null;
}

/**
 * Valida placas brasileiras nos formatos antigo e Mercosul
 * @param plate - Placa a ser validada
 * @returns Objeto com resultado da validação
 */
export const validateBrazilianPlate = (plate: string): PlateValidationResult => {
  if (!plate) {
    return { isValid: false, type: null, error: null };
  }

  // Remove espaços e converte para maiúscula
  const cleanPlate = plate.trim().replace(/\s+/g, '').toUpperCase();
  
  // Formato antigo: ABC-1234 (3 letras + hífen + 4 números = 8 caracteres)
  const oldFormatRegex = /^[A-Z]{3}-\d{4}$/;
  
  // Formato Mercosul: ABC1A12 (3 letras + 1 número + 1 letra + 2 números = 7 caracteres)
  const mercosulRegex = /^[A-Z]{3}\d[A-Z]\d{2}$/;
  
  if (oldFormatRegex.test(cleanPlate)) {
    return { isValid: true, type: 'antigo', error: null };
  }
  
  if (mercosulRegex.test(cleanPlate)) {
    return { isValid: true, type: 'mercosul', error: null };
  }
  
  // Verificar se está em processo de digitação (não mostrar erro até ter pelo menos 7 caracteres para Mercosul ou 8 para antigo)
  if (cleanPlate.length < 7) {
    return { isValid: false, type: null, error: null };
  }
  
  return { 
    isValid: false, 
    type: null, 
    error: 'Formato inválido. Use ABC-1234 (antigo) ou ABC1A12 (Mercosul)' 
  };
};

/**
 * Formata a entrada da placa durante a digitação
 * Aplica formatação automática para o formato antigo (adiciona hífen)
 * Converte automaticamente para maiúsculas
 * @param value - Valor digitado pelo usuário
 * @returns Valor formatado em maiúsculas
 */
export const formatPlateInput = (value: string): string => {
  // Remove caracteres não permitidos e converte para maiúsculo
  let cleaned = value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
  
  // Se já tem hífen, é formato antigo - manter como está
  if (cleaned.includes('-')) {
    return cleaned;
  }
  
  // Auto-formatação para formato antigo: ABC1234 -> ABC-1234
  // Inserir hífen apenas se o 5º caractere for um número
  if (cleaned.length >= 4) {
    // Verifica se os primeiros 3 caracteres são letras
    const first3 = cleaned.slice(0, 3);
    const fourth = cleaned.slice(3, 4);
    const fifth = cleaned.slice(4, 5);
    
    if (/^[A-Z]{3}$/.test(first3) && /^\d$/.test(fourth)) {
      // Se o 5º caractere existir e for um número, é formato antigo - adicionar hífen
      if (fifth && /^\d$/.test(fifth)) {
        return first3 + '-' + cleaned.slice(3);
      }
      // Se ainda não digitou o 5º caractere, aguardar
      else if (!fifth) {
        return cleaned;
      }
      // Se o 5º caractere for letra, é Mercosul - não adicionar hífen
      else {
        return cleaned;
      }
    }
  }
  
  return cleaned;
};

/**
 * Verifica se uma string parece ser uma placa (contém letras e números)
 * Útil para determinar se deve aplicar validação de placa ou busca por texto livre
 * @param value - Valor a ser verificado
 * @returns true se parece ser uma placa
 */
export const looksLikePlate = (value: string): boolean => {
  const cleanValue = value.trim().replace(/[^A-Z0-9-]/g, '');
  
  // Deve ter pelo menos 3 caracteres e conter letras e números
  if (cleanValue.length < 3) return false;
  
  const hasLetters = /[A-Z]/.test(cleanValue);
  const hasNumbers = /\d/.test(cleanValue);
  
  return hasLetters && hasNumbers;
};

/**
 * Determina se deve aplicar busca automática baseada no tipo de entrada
 * @param value - Valor do campo de busca
 * @param validation - Resultado da validação da placa
 * @returns true se deve disparar busca automática
 */
export const shouldAutoSearch = (value: string, validation: PlateValidationResult): boolean => {
  // Se é uma placa válida e completa, fazer busca automática
  if (validation.isValid) return true;
  
  // Se não parece ser placa, permitir busca por texto livre com pelo menos 3 caracteres
  if (!looksLikePlate(value) && value.trim().length >= 3) return true;
  
  return false;
};