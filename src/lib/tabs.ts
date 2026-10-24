/**
 * Próximo índice de aba para uma tecla de navegação (padrão WAI-ARIA tablist).
 * Retorna null se a tecla não for de navegação.
 */
export function nextTabIndex(current: number, key: string, length: number): number | null {
  switch (key) {
    case 'ArrowRight':
      return (current + 1) % length
    case 'ArrowLeft':
      return (current - 1 + length) % length
    case 'Home':
      return 0
    case 'End':
      return length - 1
    default:
      return null
  }
}
