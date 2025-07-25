// Formatação brasileira para valores monetários
export function formatBrazilianCurrency(value: number): string {
  return value.toFixed(2).replace('.', ',');
}

// Formatação brasileira para valores decimais
export function formatBrazilianDecimal(value: number, decimals: number = 1): string {
  return value.toFixed(decimals).replace('.', ',');
}

// Formatação usando Intl para casos mais complexos
export function formatCurrencyBR(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2
  }).format(value);
}

// Formatação simples para valores com R$ prefix
export function formatSimpleCurrency(value: number): string {
  return `R$ ${formatBrazilianCurrency(value)}`;
}