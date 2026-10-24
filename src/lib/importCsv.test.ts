import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { Transaction } from '../types'
import {
  categorize,
  parseAmount,
  parseDate,
  parseStatement,
  sampleStatement,
  toTransaction,
} from './importCsv'

beforeAll(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 9, 24, 12, 0, 0))
})
afterAll(() => vi.useRealTimers())

describe('parseAmount', () => {
  it('entende o formato brasileiro', () => {
    expect(parseAmount('1.234,56')).toBe(1234.56)
    expect(parseAmount('-R$ 2.800,00')).toBe(-2800)
    expect(parseAmount('12,5')).toBe(12.5)
    expect(parseAmount('1.234')).toBe(1234)
  })
  it('entende negativos em parênteses ou com sinal no fim', () => {
    expect(parseAmount('(150,00)')).toBe(-150)
    expect(parseAmount('100,00-')).toBe(-100)
  })
  it('entende o formato internacional', () => {
    expect(parseAmount('1234.56')).toBe(1234.56)
    expect(parseAmount('1,234.56')).toBe(1234.56)
  })
  it('rejeita lixo e vazio', () => {
    expect(parseAmount('abc')).toBeNull()
    expect(parseAmount('')).toBeNull()
  })
})

describe('parseDate', () => {
  it('aceita vários formatos', () => {
    expect(parseDate('05/10/2026')).toBe('2026-10-05')
    expect(parseDate('5-1-26')).toBe('2026-01-05')
    expect(parseDate('2026-10-05')).toBe('2026-10-05')
    expect(parseDate('2026-10-05T10:00:00')).toBe('2026-10-05')
  })
  it('rejeita datas impossíveis', () => {
    expect(parseDate('31/02/2026')).toBeNull()
    expect(parseDate('amanhã')).toBeNull()
  })
})

describe('categorize', () => {
  it('despesas', () => {
    expect(categorize('Pagamento Simples Nacional DAS', 'despesa')).toBe('Impostos')
    expect(categorize('PAG BOLETO ALUGUEL ESCRITÓRIO', 'despesa')).toBe('Estrutura')
    expect(categorize('Anúncios Meta Ads', 'despesa')).toBe('Marketing')
    expect(categorize('Vercel Pro', 'despesa')).toBe('Tecnologia')
    expect(categorize('Folha de pagamento', 'despesa')).toBe('Pessoal')
    expect(categorize('Academia Smart Fit', 'despesa')).toBe('Outros')
  })
  it('não confunde "das" (preposição) com imposto', () => {
    expect(categorize('Pagamento das contas da casa', 'despesa')).toBe('Outros')
  })
  it('receitas', () => {
    expect(categorize('Mensalidade Clínica Vida', 'receita')).toBe('Assinaturas')
    expect(categorize('Venda loja online', 'receita')).toBe('Produtos')
    expect(categorize('PIX recebido Studio Aurora', 'receita')).toBe('Serviços')
    expect(categorize('Rendimento', 'receita')).toBe('Outros')
  })
})

describe('parseStatement', () => {
  it('lê CSV com ; e valor com sinal', () => {
    const { rows, errors } = parseStatement(
      'Data;Descrição;Valor\n05/10/2026;Aluguel escritório;-2.800,00\n10/10/2026;Pix cliente Studio Aurora;3.500,00',
    )
    expect(errors).toEqual([])
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({
      date: '2026-10-05',
      type: 'despesa',
      amount: 2800,
      category: 'Estrutura',
    })
    expect(rows[1]).toMatchObject({ type: 'receita', amount: 3500, category: 'Serviços' })
  })

  it('lê CSV com vírgula e campos entre aspas (e BOM)', () => {
    const { rows } = parseStatement('﻿Data,Histórico,Valor\n05/10/2026,"Google Ads","-1.200,00"')
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ type: 'despesa', amount: 1200, category: 'Marketing' })
  })

  it('lê colunas separadas de Débito e Crédito', () => {
    const { rows } = parseStatement(
      'Data;Descrição;Débito;Crédito\n01/10/2026;Folha de pagamento;3500,00;\n02/10/2026;Venda produto;;900,00',
    )
    expect(rows.map((r) => [r.type, r.amount])).toEqual([
      ['despesa', 3500],
      ['receita', 900],
    ])
  })

  it('a coluna Tipo tem prioridade sobre o sinal do valor', () => {
    const { rows } = parseStatement('Data;Descrição;Valor;Tipo\n01/10/2026;Mensalidade academia;50,00;Débito')
    expect(rows[0].type).toBe('despesa')
  })

  it('pula linhas antes do cabeçalho e linhas em branco', () => {
    const { rows, errors } = parseStatement(
      'Extrato conta corrente\nAgência 0001\n\nData;Descrição;Valor\n\n01/10/2026;Café;-12,00\n',
    )
    expect(errors).toEqual([])
    expect(rows).toHaveLength(1)
  })

  it('reporta linhas com erro e segue com as demais', () => {
    const { rows, errors } = parseStatement(
      'Data;Descrição;Valor\nxx/10/2026;Teste;-10,00\n02/10/2026;Ok;-5,00\n03/10/2026;Sem valor;abc',
    )
    expect(rows).toHaveLength(1)
    expect(errors).toHaveLength(2)
    expect(errors[0]).toContain('Linha 2')
    expect(errors[1]).toContain('Linha 4')
  })

  it('avisa quando o cabeçalho não é reconhecido', () => {
    const { rows, errors } = parseStatement('foo;bar\n1;2')
    expect(rows).toEqual([])
    expect(errors[0]).toContain('Cabeçalho não reconhecido')
  })

  it('marca como duplicado o que já existe nos lançamentos', () => {
    const existing: Transaction[] = [
      {
        id: 'x',
        type: 'despesa',
        description: 'ALUGUEL ESCRITÓRIO',
        party: 'p',
        category: 'Estrutura',
        amount: 2800,
        issueDate: '2026-10-05',
        dueDate: '2026-10-05',
        paidDate: '2026-10-05',
        recurring: false,
      },
    ]
    const { rows } = parseStatement(
      'Data;Descrição;Valor\n05/10/2026;Aluguel escritório;-2.800,00\n06/10/2026;Aluguel escritório;-2.800,00',
      existing,
    )
    expect(rows.map((r) => r.duplicate)).toEqual([true, false])
  })

  it('o extrato de exemplo é lido sem erros', () => {
    const { rows, errors } = parseStatement(sampleStatement())
    expect(errors).toEqual([])
    expect(rows.length).toBeGreaterThanOrEqual(10)
    expect(rows.some((r) => r.type === 'receita')).toBe(true)
    expect(rows.some((r) => r.type === 'despesa')).toBe(true)
  })
})

describe('toTransaction', () => {
  it('lançamento passado já nasce liquidado', () => {
    const t = toTransaction({
      date: '2026-10-05',
      description: 'Aluguel',
      amount: 2800,
      type: 'despesa',
      category: 'Estrutura',
    })
    expect(t).toMatchObject({ dueDate: '2026-10-05', paidDate: '2026-10-05', recurring: false })
  })
  it('data futura fica em aberto', () => {
    const t = toTransaction({
      date: '2026-11-05',
      description: 'Boleto',
      amount: 100,
      type: 'despesa',
      category: 'Outros',
    })
    expect(t.paidDate).toBeUndefined()
  })
})
