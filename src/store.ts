import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Transaction } from './types'
import { generateMock } from './data/mock'
import { iso } from './lib/finance'

type Theme = 'dark' | 'light'

interface State {
  txs: Transaction[]
  initialBalance: number
  theme: Theme
  add: (tx: Omit<Transaction, 'id'>) => void
  update: (id: string, patch: Partial<Transaction>) => void
  remove: (id: string) => void
  markPaid: (id: string) => void
  toggleTheme: () => void
  resetDemo: () => void
}

const uid = () => Math.random().toString(36).slice(2, 10)

export const useStore = create<State>()(
  persist(
    (set) => ({
      txs: generateMock(),
      initialBalance: 12000,
      theme: 'dark',
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
      update: (id, patch) =>
        set((s) => ({ txs: s.txs.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
      remove: (id) => set((s) => ({ txs: s.txs.filter((t) => t.id !== id) })),
      markPaid: (id) =>
        set((s) => ({
          txs: s.txs.map((t) => (t.id === id ? { ...t, paidDate: iso(new Date()) } : t)),
        })),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
      resetDemo: () => set({ txs: generateMock() }),
    }),
    { name: 'fluxa-v1' },
  ),
)
