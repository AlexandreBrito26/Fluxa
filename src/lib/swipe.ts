export type SwipeDirection = 'left' | 'right' | null

/**
 * Classifica um gesto horizontal. Só vale se o deslocamento horizontal passar
 * do limiar e for claramente maior que o vertical (senão é rolagem da página).
 */
export function swipeDirection(dx: number, dy: number, threshold = 60): SwipeDirection {
  if (Math.abs(dx) < threshold) return null
  if (Math.abs(dx) <= Math.abs(dy) * 1.5) return null
  return dx > 0 ? 'right' : 'left'
}
