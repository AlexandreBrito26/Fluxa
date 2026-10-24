import { describe, expect, it } from 'vitest'
import { nextTabIndex } from './tabs'

describe('nextTabIndex', () => {
  it('avança e volta com as setas, dando a volta nas pontas', () => {
    expect(nextTabIndex(0, 'ArrowRight', 7)).toBe(1)
    expect(nextTabIndex(6, 'ArrowRight', 7)).toBe(0)
    expect(nextTabIndex(0, 'ArrowLeft', 7)).toBe(6)
  })
  it('Home e End vão para as pontas', () => {
    expect(nextTabIndex(3, 'Home', 7)).toBe(0)
    expect(nextTabIndex(3, 'End', 7)).toBe(6)
  })
  it('ignora outras teclas', () => {
    expect(nextTabIndex(2, 'Enter', 7)).toBeNull()
  })
})
