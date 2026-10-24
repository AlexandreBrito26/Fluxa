import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const pub = (p: string) => join(process.cwd(), 'public', p)
const manifest = JSON.parse(readFileSync(pub('manifest.webmanifest'), 'utf8'))

describe('PWA', () => {
  it('manifest tem os campos exigidos para instalação', () => {
    expect(manifest.name).toBeTruthy()
    expect(manifest.short_name).toBeTruthy()
    expect(manifest.start_url).toBeTruthy()
    expect(manifest.display).toBe('standalone')
    const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes)
    expect(sizes).toContain('192x192')
    expect(sizes).toContain('512x512')
  })

  it('manifest tem um ícone maskable', () => {
    expect(manifest.icons.some((i: { purpose: string }) => i.purpose === 'maskable')).toBe(true)
  })

  it('todos os ícones do manifest existem', () => {
    for (const icon of manifest.icons as { src: string }[]) {
      expect(existsSync(pub(icon.src)), icon.src).toBe(true)
    }
  })

  it('todos os arquivos pré-carregados pelo service worker existem', () => {
    const sw = readFileSync(pub('sw.js'), 'utf8')
    const list = sw.match(/const PRECACHE = \[([\s\S]*?)\]/)?.[1] ?? ''
    const files = [...list.matchAll(/'\.\/([^']*)'/g)].map((m) => m[1])
    expect(files.length).toBeGreaterThan(0)
    for (const f of files) {
      // './' e './index.html' são gerados no build; os demais vivem em public/
      if (f === '' || f === 'index.html') continue
      expect(existsSync(pub(f)), f).toBe(true)
    }
  })

  it('index.html referencia manifest, ícone e apple-touch-icon', () => {
    const html = readFileSync(join(process.cwd(), 'index.html'), 'utf8')
    expect(html).toContain('rel="manifest"')
    expect(html).toContain('rel="apple-touch-icon"')
    expect(existsSync(pub('icons/apple-touch-icon.png'))).toBe(true)
  })
})
