import { describe, expect, it } from 'vitest'
import { isOfx, parseOfx, parseOfxDate } from './importOfx'

const SAMPLE = `OFXHEADER:100
DATA:OFXSGML
VERSION:102

<OFX>
<BANKMSGSRSV1><STMTTRNRS><STMTRS>
<BANKTRANLIST>
<DTSTART>20261001
<DTEND>20261020
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20261015120000[-3:BRT]
<TRNAMT>-398.72
<FITID>1001
<MEMO>PAG ENERGIA ELETRICA
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20261016
<TRNAMT>4800.00
<FITID>1002
<NAME>PIX RECEBIDO STUDIO AURORA
<MEMO>Transf &amp; pix
</STMTTRN>
<STMTTRN>
<DTPOSTED>99991399
<TRNAMT>10
<NAME>INVALIDA
</STMTTRN>
</BANKTRANLIST>
</STMTRS></STMTTRNRS></BANKMSGSRSV1>
</OFX>`

describe('parseOfxDate', () => {
  it('lê AAAAMMDD com e sem horário/fuso', () => {
    expect(parseOfxDate('20261015120000[-3:BRT]')).toBe('2026-10-15')
    expect(parseOfxDate('20260301')).toBe('2026-03-01')
  })
  it('rejeita datas impossíveis', () => {
    expect(parseOfxDate('20261340')).toBeNull()
    expect(parseOfxDate('')).toBeNull()
  })
})

describe('isOfx', () => {
  it('detecta pela extensão ou pela tag <OFX>', () => {
    expect(isOfx('', 'extrato.ofx')).toBe(true)
    expect(isOfx('', 'extrato.QFX')).toBe(true)
    expect(isOfx(SAMPLE, 'arquivo.txt')).toBe(true)
    expect(isOfx('Data;Valor\n01/01/2026;10', 'extrato.csv')).toBe(false)
  })
})

describe('parseOfx', () => {
  it('converte sinal em tipo e valor absoluto', () => {
    const { rows } = parseOfx(SAMPLE)
    expect(rows[0]).toMatchObject({ date: '2026-10-15', amount: 398.72, type: 'despesa' })
    expect(rows[1]).toMatchObject({ date: '2026-10-16', amount: 4800, type: 'receita' })
  })

  it('usa NAME e MEMO na descrição e desfaz entidades', () => {
    const { rows } = parseOfx(SAMPLE)
    expect(rows[1].description).toBe('PIX RECEBIDO STUDIO AURORA — Transf & pix')
    expect(rows[0].description).toBe('PAG ENERGIA ELETRICA')
  })

  it('categoriza igual ao CSV', () => {
    const { rows } = parseOfx(SAMPLE)
    expect(rows[0].category).toBe('Estrutura')
    expect(rows[1].category).toBe('Serviços')
  })

  it('reporta transações com data inválida sem parar a leitura', () => {
    const res = parseOfx(SAMPLE)
    expect(res.rows).toHaveLength(2)
    expect(res.errors).toHaveLength(1)
    expect(res.errors[0]).toContain('Transação 3')
  })

  it('marca possível duplicado já existente', () => {
    const existing = [
      {
        id: 'x',
        type: 'despesa' as const,
        description: 'PAG ENERGIA ELETRICA',
        party: '',
        category: 'Estrutura',
        amount: 398.72,
        issueDate: '2026-10-15',
        dueDate: '2026-10-15',
        recurring: false,
      },
    ]
    const { rows } = parseOfx(SAMPLE, existing)
    expect(rows[0].duplicate).toBe(true)
    expect(rows[1].duplicate).toBe(false)
  })

  it('retorna erro quando não há transações', () => {
    const res = parseOfx('<OFX></OFX>')
    expect(res.rows).toHaveLength(0)
    expect(res.errors[0]).toContain('Nenhuma transação')
  })
})
