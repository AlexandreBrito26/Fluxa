import { describe, expect, it } from 'vitest'
import { accentVisibleOn, contrastRatio, onAccentFor, ACCENT_PRESETS } from './accent'

describe('onAccentFor', () => {
  it('usa texto escuro sobre cor clara e branco sobre cor escura', () => {
    expect(onAccentFor('#fbbf24')).toBe('#0b0f1a') // âmbar claro
    expect(onAccentFor('#1e3a8a')).toBe('#ffffff') // azul escuro
  })
  it('o texto escolhido sempre atinge 4.5:1 nas cores sugeridas', () => {
    for (const c of ACCENT_PRESETS) {
      expect(contrastRatio(onAccentFor(c), c)).toBeGreaterThanOrEqual(4.5)
    }
  })
})

describe('accentVisibleOn', () => {
  it('aceita destaque visível sobre o card escuro e recusa um quase igual ao fundo', () => {
    expect(accentVisibleOn('#818cf8', '#131a2a')).toBe(true)
    expect(accentVisibleOn('#1a2236', '#131a2a')).toBe(false)
  })
})
