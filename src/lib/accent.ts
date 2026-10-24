/** Cores de destaque sugeridas. Vazio = cor padrão do tema. */
export const ACCENT_PRESETS = ['#818cf8', '#22d3ee', '#34d399', '#fb7185', '#fbbf24']

function luminance(hex: string) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const [r, g, b] = c.map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Razão de contraste WCAG entre duas cores hex (#rrggbb). */
export function contrastRatio(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** Cor do texto sobre o botão de destaque: a que tiver mais contraste (escuro ou branco). */
export function onAccentFor(accent: string): string {
  return contrastRatio('#0b0f1a', accent) >= contrastRatio('#ffffff', accent) ? '#0b0f1a' : '#ffffff'
}

/** Destaque usado como texto/borda precisa de pelo menos 3:1 sobre o fundo do card (WCAG, componentes gráficos). */
export function accentVisibleOn(accent: string, card: string) {
  return contrastRatio(accent, card) >= 3
}
