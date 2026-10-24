import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Account, Transaction, Transfer } from './types'
import { generateMock } from './data/mock'
import { iso } from './lib/finance'
import { switchProfileData, type Profile, type ProfileData } from './lib/profiles'
import { reconcileAfterEdit } from './lib/reconcile'

type Theme = 'dark' | 'light'

interface State {
  txs: Transaction[]
  initialBalance: number
  theme: Theme
  /** Cor de destaque escolhida pelo usuário (#rrggbb). Vazio = padrão do tema. */
  accent: string
  setAccent: (hex: string) => void
  /** Limite mensal por categoria de despesa (categoria sem limite = sem meta). */
  budgets: Record<string, number>
  setBudget: (category: string, limit: number | null) => void
  add: (tx: Omit<Transaction, 'id'>) => void
  addMany: (items: Omit<Transaction, 'id'>[]) => void
  update: (id: string, patch: Partial<Transaction>) => void
  remove: (id: string) => void
  markPaid: (id: string) => void
  toggleTheme: () => void
  resetDemo: () => void
  /** Apaga todos os lançamentos, metas e saldo inicial, para começar com dados próprios. */
  clearAll: () => void
  accounts: Account[]
  transfers: Transfer[]
  /** Cria conta extra. O saldo inicial dela soma ao saldo inicial total. */
  addAccount: (name: string, initial: number) => void
  addTransfer: (t: Omit<Transfer, 'id'>) => void
  toggleReconciled: (id: string) => void
  /** Perfis simulados (ex.: Pessoal, Loja). O ativo fica nos campos de topo. */
  profiles: Profile[]
  profileId: string
  stash: Record<string, ProfileData>
  switchProfile: (id: string) => void
  /** Cria perfil e já o ativa. `demo` = com dados de exemplo; senão, começa vazio. */
  addProfile: (name: string, demo: boolean) => void
}

const DEFAULT_BUDGETS: Record<string, number> = {
  Estrutura: 4500,
  Pessoal: 3400,
  Tecnologia: 400,
  Marketing: 1500,
  Impostos: 2200,
  Serviços: 700,
}

const uid = () => Math.random().toString(36).slice(2, 10)

/** Dados do perfil ativo, para guardá-los ao trocar. */
const snap = (s: Pick<ProfileData, 'txs' | 'initialBalance' | 'budgets' | 'accounts' | 'transfers'>): ProfileData => ({
  txs: s.txs,
  initialBalance: s.initialBalance,
  budgets: s.budgets,
  accounts: s.accounts,
  transfers: s.transfers,
})

export const useStore = create<State>()(
  persist(
    (set) => ({
      txs: generateMock(),
      initialBalance: 12000,
      theme: 'dark',
      accent: '',
      setAccent: (hex) => set({ accent: hex }),
      budgets: { ...DEFAULT_BUDGETS },
      setBudget: (category, limit) =>
        set((s) => {
          const budgets = { ...s.budgets }
          if (limit && limit > 0) budgets[category] = limit
          else delete budgets[category]
          return { budgets }
        }),
      add: (tx) =>
        set((s) => {
          if (!tx.recurring) return { txs: [...s.txs, { ...tx, id: uid() }] }
          // lançamento recorrente: gera 6 ocorrências mensais
          const base = new Date(`${tx.dueDate}T00:00:00`)
          const extra = Array.from({ length: 6 }, (_, i) => {
            const d = new Date(base.getFullYear(), base.getMonth() + i, base.getDate())
            return { ...tx, id: uid(), dueDate: iso(d), paidDate: i === 0 ? tx.paidDate : undefined }
          })
          return { txs: [...s.txs, ...extra] }
        }),
      addMany: (items) =>
        set((s) => ({ txs: [...s.txs, ...items.map((t) => ({ ...t, id: uid() }))] })),
      update: (id, patch) =>
        set((s) => ({
          txs: s.txs.map((t) => (t.id === id ? { ...t, ...patch, ...reconcileAfterEdit(t, patch) } : t)),
        })),
      remove: (id) => set((s) => ({ txs: s.txs.filter((t) => t.id !== id) })),
      markPaid: (id) =>
        set((s) => ({
          txs: s.txs.map((t) => (t.id === id ? { ...t, paidDate: iso(new Date()) } : t)),
        })),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
      resetDemo: () =>
        set({ txs: generateMock(), budgets: { ...DEFAULT_BUDGETS }, accounts: [], transfers: [], initialBalance: 12000 }),
      clearAll: () => set({ txs: [], budgets: {}, initialBalance: 0, accounts: [], transfers: [] }),
      accounts: [],
      transfers: [],
      addAccount: (name, initial) =>
        set((s) => ({
          accounts: [...s.accounts, { id: uid(), name, initial }],
          initialBalance: s.initialBalance + initial,
        })),
      addTransfer: (t) => set((s) => ({ transfers: [...s.transfers, { ...t, id: uid() }] })),
      profiles: [{ id: 'pessoal', name: 'Pessoal' }],
      profileId: 'pessoal',
      stash: {},
      switchProfile: (id) =>
        set((s) => {
          const active: ProfileData = snap(s)
          const res = switchProfileData(s.profileId, active, s.stash, id)
          if (!res) return {}
          return { ...res.data, stash: res.stash, profileId: res.active }
        }),
      addProfile: (name, demo) =>
        set((s) => {
          const id = uid()
          const next: ProfileData = demo
            ? { txs: generateMock(), budgets: { ...DEFAULT_BUDGETS }, initialBalance: 12000, accounts: [], transfers: [] }
            : { txs: [], budgets: {}, initialBalance: 0, accounts: [], transfers: [] }
          return {
            ...next,
            profiles: [...s.profiles, { id, name }],
            stash: { ...s.stash, [s.profileId]: snap(s) },
            profileId: id,
          }
        }),
      toggleReconciled: (id) =>
        set((s) => ({
          txs: s.txs.map((t) => (t.id === id ? { ...t, reconciled: !t.reconciled } : t)),
        })),
    }),
    { name: 'fluxa-v1' },
  ),
)
