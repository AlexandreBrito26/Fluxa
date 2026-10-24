import { describe, expect, it } from 'vitest'
import { swipeDirection } from './swipe'

describe('swipeDirection', () => {
  it('detecta deslize para a direita e para a esquerda', () => {
    expect(swipeDirection(120, 5)).toBe('right')
    expect(swipeDirection(-120, 5)).toBe('left')
  })
  it('ignora deslocamento abaixo do limiar', () => {
    expect(swipeDirection(30, 0)).toBeNull()
  })
  it('ignora gesto mais vertical que horizontal (rolagem)', () => {
    expect(swipeDirection(100, 90)).toBeNull()
  })
  it('respeita limiar customizado', () => {
    expect(swipeDirection(40, 0, 30)).toBe('right')
  })
})
