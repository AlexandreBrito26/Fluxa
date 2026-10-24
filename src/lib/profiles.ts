import type { Account, Transaction, Transfer } from '../types'

/** Dados de um perfil. O perfil ativo fica nos campos de topo da store. */
export interface ProfileData {
  txs: Transaction[]
  initialBalance: number
  budgets: Record<string, number>
  accounts: Account[]
  transfers: Transfer[]
}

export interface Profile {
  id: string
  name: string
}

/**
 * Troca de perfil: guarda os dados do perfil ativo no `stash` e devolve os dados
 * do perfil de destino. Retorna null se não há o que trocar.
 */
export function switchProfileData(
  active: string,
  activeData: ProfileData,
  stash: Record<string, ProfileData>,
  target: string,
): { data: ProfileData; stash: Record<string, ProfileData>; active: string } | null {
  if (target === active || !stash[target]) return null
  const { [target]: data, ...rest } = stash
  return { data, stash: { ...rest, [active]: activeData }, active: target }
}
