import type { Transaction, TxType } from '../types'
import { addDays, fmtDate, iso } from './finance'

export interface ParsedRow {
  line: number
  date: string // YYYY-MM-DD
  description: string
  amount: number // sempre positivo
  type: TxType
  category: string
  duplicate: boolean
}

export interface ParseResult {
  rows: ParsedRow[]
  errors: string[]
}

/** Minúsculas, sem acentos e com espaços normalizados. */
export const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

// ---------- valores e datas ----------

/** Converte "1.234,56", "-R$ 2.800,00", "(150,00)", "100,00-" ou "1234.56". */
export function parseAmount(input: string): number | null {
  let s = input.replace(/R\$/gi, '').replace(/[\s ]/g, '')
  if (!s) return null
  let negative = false
  if (/^\(.*\)$/.test(s)) {
    negative = true
    s = s.slice(1, -1)
  }
  if (s.endsWith('-')) {
    negative = true
    s = s.slice(0, -1)
  }
  if (s.startsWith('-')) {
    negative = true
    s = s.slice(1)
  } else if (s.startsWith('+')) {
    s = s.slice(1)
  }
  if (!/^[\d.,]+$/.test(s)) return null

  const lastComma = s.lastIndexOf(',')
  const lastDot = s.lastIndexOf('.')
  if (lastComma >= 0 && lastDot >= 0) {
    // o último separador é o decimal
    const dec = lastComma > lastDot ? ',' : '.'
    const thousands = dec === ',' ? /\./g : /,/g
    s = s.replace(thousands, '').replace(dec, '.')
  } else if (lastComma >= 0) {
    s = s.replace(/\./g, '').replace(',', '.')
  } else if (lastDot >= 0) {
    // "1.234" ou "1.234.567" = milhar; "1234.56" = decimal
    if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '')
  }
  const n = Number(s)
  if (!Number.isFinite(n)) return null
  return negative ? -n : n
}

/** Aceita dd/mm/aaaa, dd-mm-aa, dd.mm.aaaa e aaaa-mm-dd. */
export function parseDate(input: string): string | null {
  const s = input.trim()
  let y: number, m: number, d: number
  let match = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (match) {
    y = +match[1]
    m = +match[2]
    d = +match[3]
  } else {
    match = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2}|\d{4})\b/)
    if (!match) return null
    d = +match[1]
    m = +match[2]
    y = +match[3]
    if (y < 100) y += 2000
  }
  const date = new Date(y, m - 1, d)
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null
  return iso(date)
}

// ---------- categorização automática ----------

const RULES: Record<TxType, [RegExp, string][]> = {
  despesa: [
    [/(simples nacional|darf|\bdas\b (mei|simples)|guia das|imposto|\biss\b|icms|\binss\b|fgts|irpj|tributo)/, 'Impostos'],
    [/(aluguel|condominio|iptu|energia|\bluz\b|\bagua\b|saneamento|internet|fibra|telefone|\bvivo\b|\bclaro\b|\btim\b)/, 'Estrutura'],
    [/(salario|folha|pro.?labore|freelanc|\bferias\b|13o|vale (refeicao|transporte|alimentacao)|beneficio)/, 'Pessoal'],
    [/(google ads|meta ads|facebook|instagram|anuncio|trafego|marketing|publicidade|impulsion)/, 'Marketing'],
    [/(\baws\b|vercel|github|google cloud|hospedagem|dominio|software|saas|assinatura|licenca|figma|notion|openai|anthropic|digitalocean|netlify)/, 'Tecnologia'],
    [/(contab|advoca|consultoria|cartorio|honorario|manutencao)/, 'Serviços'],
  ],
  receita: [
    [/(mensalidade|assinatura|\bplano\b)/, 'Assinaturas'],
    [/(venda|produto|pedido|loja)/, 'Produtos'],
    [/(\bpix\b|cliente|projeto|servico|consultoria|honorario|\bted\b|\bdoc\b)/, 'Serviços'],
  ],
}

export function categorize(description: string, type: TxType): string {
  const text = norm(description)
  for (const [re, category] of RULES[type]) if (re.test(text)) return category
  return 'Outros'
}

// ---------- leitura do CSV ----------

function detectDelimiter(text: string) {
  const first = text.split(/\r?\n/).find((l) => l.trim()) ?? ''
  const count = (c: string) => first.split(c).length - 1
  const options: [string, number][] = [
    [';', count(';')],
    ['\t', count('\t')],
    [',', count(',')],
  ]
  options.sort((a, b) => b[1] - a[1])
  return options[0][1] > 0 ? options[0][0] : ';'
}

function splitRows(text: string, delim: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"'
          i++
        } else quoted = false
      } else cell += c
    } else if (c === '"') quoted = true
    else if (c === delim) {
      row.push(cell)
      cell = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(cell)
      cell = ''
      rows.push(row)
      row = []
    } else cell += c
  }
  if (cell !== '' || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows
}

interface Columns {
  date: number
  desc: number
  amount: number
  debit: number
  credit: number
  tipo: number
}

function detectColumns(cells: string[]): Columns | null {
  const h = cells.map(norm)
  const find = (re: RegExp) => h.findIndex((x) => re.test(x))
  const cols: Columns = {
    date: find(/^(data|date|dt\b)/),
    desc: find(/(descri|historico|lancamento|memo|detalhe|estabelecimento|favorecido)/),
    amount: find(/^(valor|value|amount|quantia)/),
    debit: find(/^(debito|saida|debit)/),
    credit: find(/^(credito|entrada|credit)/),
    tipo: find(/^(tipo|type|natureza|d\/c)/),
  }
  const hasValue = cols.amount >= 0 || cols.debit >= 0 || cols.credit >= 0
  return cols.date >= 0 && cols.desc >= 0 && hasValue ? cols : null
}

function typeFromLabel(label: string): TxType | null {
  const s = norm(label)
  if (/^(d|deb|debito|saida|despesa|pagamento)$/.test(s)) return 'despesa'
  if (/^(c|cred|credito|entrada|receita|recebimento)$/.test(s)) return 'receita'
  return null
}

const dupKey = (type: string, date: string, amount: number, description: string) =>
  `${type}|${date}|${amount.toFixed(2)}|${norm(description)}`

/**
 * Lê um extrato em CSV. Reconhece o cabeçalho (Data, Descrição/Histórico, Valor
 * ou Débito/Crédito, Tipo opcional), o delimitador e o formato brasileiro de
 * datas e valores. Valor negativo = despesa; positivo = receita.
 */
export function parseStatement(raw: string, existing: Transaction[] = []): ParseResult {
  const text = raw.replace(/^﻿/, '')
  const rows = splitRows(text, detectDelimiter(text))

  let headerIdx = -1
  let cols: Columns | null = null
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    cols = detectColumns(rows[i])
    if (cols) {
      headerIdx = i
      break
    }
  }
  if (!cols) {
    return {
      rows: [],
      errors: ['Cabeçalho não reconhecido. Use colunas como: Data, Descrição, Valor.'],
    }
  }

  const known = new Set(existing.map((t) => dupKey(t.type, t.dueDate, t.amount, t.description)))
  const out: ParsedRow[] = []
  const errors: string[] = []

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const cells = rows[i]
    if (cells.every((c) => c.trim() === '')) continue
    const line = i + 1
    const at = (idx: number) => (idx >= 0 ? (cells[idx] ?? '') : '')

    const date = parseDate(at(cols.date))
    if (!date) {
      errors.push(`Linha ${line}: data inválida ("${at(cols.date).trim()}")`)
      continue
    }
    const description = at(cols.desc).replace(/\s+/g, ' ').trim()
    if (!description) {
      errors.push(`Linha ${line}: descrição vazia`)
      continue
    }

    let type: TxType
    let amount: number
    if (cols.amount >= 0) {
      const v = parseAmount(at(cols.amount))
      if (v === null || v === 0) {
        errors.push(`Linha ${line}: valor inválido ("${at(cols.amount).trim()}")`)
        continue
      }
      type = v < 0 ? 'despesa' : 'receita'
      amount = Math.abs(v)
      const byLabel = cols.tipo >= 0 ? typeFromLabel(at(cols.tipo)) : null
      if (byLabel) type = byLabel
    } else {
      const d = parseAmount(at(cols.debit))
      const c = parseAmount(at(cols.credit))
      if (d) {
        type = 'despesa'
        amount = Math.abs(d)
      } else if (c) {
        type = 'receita'
        amount = Math.abs(c)
      } else {
        errors.push(`Linha ${line}: sem valor de débito ou crédito`)
        continue
      }
    }

    amount = Math.round(amount * 100) / 100
    out.push({
      line,
      date,
      description,
      amount,
      type,
      category: categorize(description, type),
      duplicate: known.has(dupKey(type, date, amount, description)),
    })
  }
  return { rows: out, errors }
}

/** Lançamento vindo do extrato: já liquidado na própria data (se não for futura). */
export function toTransaction(
  r: Pick<ParsedRow, 'date' | 'description' | 'amount' | 'type' | 'category'>,
): Omit<Transaction, 'id'> {
  return {
    type: r.type,
    description: r.description,
    party: 'Extrato bancário',
    category: r.category,
    amount: r.amount,
    issueDate: r.date,
    dueDate: r.date,
    paidDate: r.date <= iso(new Date()) ? r.date : undefined,
    recurring: false,
  }
}

/** Extrato de exemplo com datas relativas a hoje, para testar a importação. */
export function sampleStatement(): string {
  const day = (n: number) => fmtDate(iso(addDays(new Date(), -n)))
  const lines: [number, string, string][] = [
    [12, 'PIX RECEBIDO STUDIO AURORA', '4.800,00'],
    [11, 'PAG BOLETO ALUGUEL ESCRITORIO', '-2.800,00'],
    [10, 'GOOGLE ADS BRASIL', '-1.150,40'],
    [9, 'MENSALIDADE CLINICA VIDA', '890,00'],
    [8, 'VERCEL PRO', '-110,00'],
    [7, 'FOLHA PAGAMENTO FREELANCER', '-3.200,00'],
    [6, 'VENDA LOJA ONLINE PEDIDO 4821', '1.340,50'],
    [5, 'ENERGIA ELETRICA', '-398,72'],
    [4, 'DARF SIMPLES NACIONAL', '-1.850,00'],
    [3, 'ACADEMIA SMART FIT', '-119,90'],
    [2, 'PIX RECEBIDO PROJETO MODA NORTE', '6.200,00'],
  ]
  return ['Data;Descrição;Valor', ...lines.map(([n, d, v]) => `${day(n)};${d};${v}`)].join('\n')
}
