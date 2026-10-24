import { describe, expect, it } from 'vitest'

// Cores copiadas de src/index.css. Se mudar o tema, atualize aqui também.
const THEME = {
  dark: { bg: '#0b0f1a', card: '#131a2a', text: '#e8ecf5', muted: '#8a96b0', red: '#f87171', green: '#34d399', amber: '#fbbf24', accent: '#818cf8', onAccent: '#0b0f1a' },
  light: { bg: '#f4f6fb', card: '#ffffff', text: '#17203a', muted: '#667089', red: '#dc2626', green: '#047857', amber: '#b45309', accent: '#4f46e5', onAccent: '#ffffff' },
} as const

/** Luminância relativa WCAG (0 = preto, 1 = branco). */
function luminance(hex: string) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const [r, g, b] = c.map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

describe('contraste WCAG AA (texto normal ≥ 4.5)', () => {
  for (const [name, t] of Object.entries(THEME)) {
    it(`${name}: texto e textos secundários sobre o fundo do card`, () => {
      expect(contrast(t.text, t.card)).toBeGreaterThanOrEqual(4.5)
      expect(contrast(t.muted, t.card)).toBeGreaterThanOrEqual(4.5)
      expect(contrast(t.muted, t.bg)).toBeGreaterThanOrEqual(4.5)
    })
    it(`${name}: cores de status sobre o card`, () => {
      expect(contrast(t.red, t.card)).toBeGreaterThanOrEqual(4.5)
      expect(contrast(t.green, t.card)).toBeGreaterThanOrEqual(4.5)
      expect(contrast(t.amber, t.card)).toBeGreaterThanOrEqual(4.5)
    })
    it(`${name}: texto sobre botão de destaque`, () => {
      expect(contrast(t.onAccent, t.accent)).toBeGreaterThanOrEqual(4.5)
    })
  }
})
