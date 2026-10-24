import { describe, expect, it } from 'vitest'
import { switchProfileData, type ProfileData } from './profiles'

const data = (name: string): ProfileData => ({
  txs: [],
  initialBalance: name.length,
  budgets: { [name]: 1 },
  accounts: [],
  transfers: [],
})

describe('switchProfileData', () => {
  it('salva o perfil ativo e carrega o de destino', () => {
    const pessoal = data('pessoal')
    const loja = data('loja')
    const res = switchProfileData('pessoal', pessoal, { loja }, 'loja')
    expect(res).not.toBeNull()
    expect(res!.active).toBe('loja')
    expect(res!.data).toBe(loja)
    expect(res!.stash.pessoal).toBe(pessoal)
    expect(res!.stash.loja).toBeUndefined()
  })

  it('não faz nada ao trocar para o perfil já ativo', () => {
    expect(switchProfileData('pessoal', data('pessoal'), {}, 'pessoal')).toBeNull()
  })

  it('não troca para perfil inexistente', () => {
    expect(switchProfileData('pessoal', data('pessoal'), {}, 'fantasma')).toBeNull()
  })

  it('preserva dados de outros perfis ao alternar várias vezes', () => {
    const a = data('a')
    const b = data('b')
    const c = data('c')
    let state = switchProfileData('a', a, { b, c }, 'b')!
    state = switchProfileData(state.active, state.data, state.stash, 'c')!
    expect(state.active).toBe('c')
    expect(state.stash.a).toBe(a)
    expect(state.stash.b).toBe(b)
  })
})
