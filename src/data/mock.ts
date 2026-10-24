import type { Transaction, TxType } from '../types'
import { addDays, daysUntil, iso } from '../lib/finance'

function rng(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const FIXED: [string, string, string, number, number][] = [
  // descrição, fornecedor, categoria, valor, dia do mês
  ['Aluguel do escritório', 'Imobiliária Central', 'Estrutura', 2800, 5],
  ['Internet fibra', 'NetVelox', 'Estrutura', 189.9, 10],
  ['Energia elétrica', 'Companhia de Energia', 'Estrutura', 420, 12],
  ['Equipe e freelancers', 'Folha de pagamento', 'Pessoal', 3500, 5],
  ['Assinaturas de software', 'Ferramentas SaaS', 'Tecnologia', 349, 8],
  ['Anúncios Google/Meta', 'Mídia paga', 'Marketing', 1200, 15],
  ['Contabilidade', 'Contábil Alfa', 'Serviços', 600, 20],
  ['Impostos (Simples)', 'Receita Federal', 'Impostos', 1850, 20],
]

const CLIENTS = ['Studio Aurora', 'Padaria Bom Gosto', 'Clínica Vida', 'Moda Norte', 'TechNova', 'Café do Largo', 'Oficina Rápida']
const REV_CATS = ['Serviços', 'Produtos', 'Assinaturas']

/** Dados fictícios, relativos a hoje: ~5 meses de histórico + 2 meses à frente. */
export function generateMock(): Transaction[] {
  const r = rng(26)
  const now = new Date()
  const today = iso(now)
  const out: Transaction[] = []
  let n = 0

  const push = (
    type: TxType,
    description: string,
    party: string,
    category: string,
    amount: number,
    due: Date,
    recurring: boolean,
  ) => {
    const dueDate = iso(due)
    let paidDate: string | undefined
    if (dueDate <= today) {
      const recent = daysUntil(dueDate) > -20
      if (!(recent && r() < 0.25)) {
        paidDate = iso(addDays(due, type === 'receita' ? Math.floor(r() * 9) : 0))
        if (paidDate > today) paidDate = today
      }
    }
    out.push({
      id: `t${++n}`,
      type,
      description,
      party,
      category,
      amount: Math.round(amount * 100) / 100,
      issueDate: iso(addDays(due, -(15 + Math.floor(r() * 15)))),
      dueDate,
      paidDate,
      recurring,
    })
  }

  for (let m = -5; m <= 2; m++) {
    const y = now.getFullYear()
    const mo = now.getMonth() + m
    FIXED.forEach(([desc, party, cat, amount, day]) => {
      const variation = cat === 'Estrutura' && desc.startsWith('Energia') ? 0.85 + r() * 0.35 : 1
      push('despesa', desc, party, cat, amount * variation, new Date(y, mo, day), true)
    })
    const sales = 4 + Math.floor(r() * 3)
    for (let i = 0; i < sales; i++) {
      const client = CLIENTS[Math.floor(r() * CLIENTS.length)]
      const cat = REV_CATS[Math.floor(r() * REV_CATS.length)]
      const day = 3 + Math.floor(r() * 25)
      push('receita', `${cat === 'Assinaturas' ? 'Mensalidade' : 'Projeto'} — ${client}`, client, cat, 1500 + r() * 7500, new Date(y, mo, day), cat === 'Assinaturas')
    }
  }
  return out
}
