import type { Transaction, TxType } from '../types'
import { parseAmount, categorize, dupKey, type ParseResult, type ParsedRow } from './importCsv'

/** Verdadeiro se o texto parece um extrato OFX/QFX (SGML ou XML). */
export const isOfx = (text: string, name = '') => /\.(ofx|qfx)$/i.test(name) || /<OFX>/i.test(text)

const ENTITIES: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'" }
const unescape = (s: string) => s.replace(/&(amp|lt|gt|quot|apos);/g, (m) => ENTITIES[m] ?? m)

/** Data OFX: AAAAMMDD[HHMMSS[.XXX][[offset:TZ]]]. Só a parte da data importa. */
export function parseOfxDate(input: string): string | null {
  const m = input.trim().match(/^(\d{4})(\d{2})(\d{2})/)
  if (!m) return null
  const [y, mo, d] = [+m[1], +m[2], +m[3]]
  const date = new Date(y, mo - 1, d)
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** Lê os campos de um bloco <STMTTRN>. Funciona com tags SGML (sem fechamento) e XML. */
function fields(block: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const m of block.matchAll(/<([A-Z]+)>([^<\r\n]*)/gi)) {
    out[m[1].toUpperCase()] = unescape(m[2].trim())
  }
  return out
}

/**
 * Lê um extrato OFX/QFX. Cada <STMTTRN> vira um lançamento: DTPOSTED = data,
 * TRNAMT = valor (negativo = despesa), NAME/MEMO = descrição. Categoriza igual ao CSV.
 */
export function parseOfx(raw: string, existing: Transaction[] = []): ParseResult {
  const text = raw.replace(/^﻿/, '')
  const blocks = text.split(/<STMTTRN>/i).slice(1).map((b) => b.split(/<\/STMTTRN>/i)[0])
  if (!blocks.length) {
    return { rows: [], errors: ['Nenhuma transação encontrada. Verifique se o arquivo é um extrato OFX/QFX.'] }
  }

  const known = new Set(existing.map((t) => dupKey(t.type, t.dueDate, t.amount, t.description)))
  const rows: ParsedRow[] = []
  const errors: string[] = []

  blocks.forEach((block, i) => {
    const line = i + 1
    const f = fields(block)
    const date = parseOfxDate(f.DTPOSTED ?? '')
    if (!date) {
      errors.push(`Transação ${line}: data inválida (\"${f.DTPOSTED ?? ''}\")`)
      return
    }
    const value = parseAmount(f.TRNAMT ?? '')
    if (value === null || value === 0) {
      errors.push(`Transação ${line}: valor inválido (\"${f.TRNAMT ?? ''}\")`)
      return
    }
    const name = (f.NAME ?? '').replace(/\s+/g, ' ').trim()
    const memo = (f.MEMO ?? '').replace(/\s+/g, ' ').trim()
    const description = name || memo
    if (!description) {
      errors.push(`Transação ${line}: descrição vazia`)
      return
    }
    const fullDescription = memo && memo !== name && name ? `${name} — ${memo}` : description
    const type: TxType = value < 0 ? 'despesa' : 'receita'
    const amount = Math.round(Math.abs(value) * 100) / 100
    rows.push({
      line,
      date,
      description: fullDescription,
      amount,
      type,
      category: categorize(fullDescription, type),
      duplicate: known.has(dupKey(type, date, amount, fullDescription)),
    })
  })

  return { rows, errors }
}
