import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { brl, fmtDate } from '../lib/finance'
import { categorize, parseStatement, sampleStatement, toTransaction, type ParsedRow } from '../lib/importCsv'
import { isOfx, parseOfx } from '../lib/importOfx'
import { CATEGORIES, type TxType } from '../types'

interface Draft extends ParsedRow {
  key: number
  include: boolean
}

/** Extratos de banco costumam vir em Windows-1252; tenta UTF-8 primeiro. */
function decode(buf: ArrayBuffer) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf)
  } catch {
    return new TextDecoder('windows-1252').decode(buf)
  }
}

export default function ImportTab() {
  const { txs, addMany } = useStore()
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [fileName, setFileName] = useState('')
  const [message, setMessage] = useState('')

  const load = (text: string, name: string) => {
    const res = isOfx(text, name) ? parseOfx(text, txs) : parseStatement(text, txs)
    setDrafts(res.rows.map((r, i) => ({ ...r, key: i, include: !r.duplicate })))
    setErrors(res.errors)
    setFileName(name)
    setMessage('')
  }

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    load(decode(await file.arrayBuffer()), file.name)
  }

  const patch = (key: number, changes: Partial<Draft>) =>
    setDrafts((list) => list.map((d) => (d.key === key ? { ...d, ...changes } : d)))

  const changeType = (d: Draft, type: TxType) =>
    patch(d.key, { type, category: categorize(d.description, type) })

  const selected = useMemo(() => drafts.filter((d) => d.include), [drafts])
  const dupCount = drafts.filter((d) => d.duplicate).length
  const entradas = selected.filter((d) => d.type === 'receita').reduce((a, d) => a + d.amount, 0)
  const saidas = selected.filter((d) => d.type === 'despesa').reduce((a, d) => a + d.amount, 0)

  const confirm = () => {
    if (!selected.length) return
    addMany(selected.map(toTransaction))
    setMessage(`${selected.length} lançamentos importados com sucesso.`)
    setDrafts([])
    setErrors([])
    setFileName('')
  }

  const downloadTemplate = () => {
    const blob = new Blob(['﻿' + sampleStatement()], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'fluxa-modelo-extrato.csv'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <section className="card">
      <div className="toolbar">
        <h3>Importar extrato (CSV ou OFX)</h3>
        <div className="spacer" />
        <button className="ghost" onClick={() => load(sampleStatement(), 'extrato-exemplo.csv')}>
          Carregar exemplo
        </button>
        <button className="ghost" onClick={downloadTemplate}>
          Baixar modelo
        </button>
        <label className="file-btn">
          Escolher arquivo
          <input type="file" accept=".csv,.txt,.ofx,.qfx,text/csv,text/plain" onChange={onFile} hidden />
        </label>
      </div>

      <p className="footnote">
        CSV: colunas <strong>Data</strong>, <strong>Descrição</strong> (ou Histórico) e{' '}
        <strong>Valor</strong> (negativo = despesa), ou Débito e Crédito separados. OFX/QFX: exportado
        pelo internet banking, lido direto. Os
        lançamentos são categorizados automaticamente e você revisa antes de importar. Nada sai do seu
        navegador.
      </p>

      {message && <p className="alert green-box">✓ {message}</p>}

      {errors.length > 0 && (
        <div className="alert amber">
          <strong>{errors.length} linha(s) ignorada(s):</strong>
          <ul className="error-list">
            {errors.slice(0, 5).map((er) => (
              <li key={er}>{er}</li>
            ))}
            {errors.length > 5 && <li>…e mais {errors.length - 5}</li>}
          </ul>
        </div>
      )}

      {drafts.length > 0 && (
        <>
          <div className="import-summary">
            <span>
              <strong>{fileName}</strong> · {drafts.length} linhas lidas
              {dupCount > 0 && ` · ${dupCount} possível(is) duplicado(s) desmarcado(s)`}
            </span>
            <span>
              <span className="green">+{brl(entradas)}</span> · <span className="red">−{brl(saidas)}</span>
            </span>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th />
                  <th>Data</th>
                  <th>Descrição</th>
                  <th>Tipo</th>
                  <th>Categoria</th>
                  <th className="num">Valor</th>
                </tr>
              </thead>
              <tbody>
                {drafts.map((d) => (
                  <tr key={d.key} className={d.include ? '' : 'dim'}>
                    <td>
                      <input
                        type="checkbox"
                        checked={d.include}
                        onChange={(e) => patch(d.key, { include: e.target.checked })}
                        aria-label={`Importar ${d.description}`}
                      />
                    </td>
                    <td>{fmtDate(d.date)}</td>
                    <td>
                      {d.description}
                      {d.duplicate && <span className="badge atrasado dup">duplicado?</span>}
                    </td>
                    <td>
                      <select value={d.type} onChange={(e) => changeType(d, e.target.value as TxType)}>
                        <option value="despesa">Despesa</option>
                        <option value="receita">Receita</option>
                      </select>
                    </td>
                    <td>
                      <select value={d.category} onChange={(e) => patch(d.key, { category: e.target.value })}>
                        {CATEGORIES[d.type].map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </td>
                    <td className={`num ${d.type === 'receita' ? 'green' : 'red'}`}>
                      {d.type === 'receita' ? '+' : '−'}
                      {brl(d.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="toolbar import-actions">
            <button
              className="ghost"
              onClick={() => {
                setDrafts([])
                setErrors([])
                setFileName('')
              }}
            >
              Cancelar
            </button>
            <button onClick={confirm} disabled={!selected.length}>
              Importar {selected.length} lançamento{selected.length === 1 ? '' : 's'}
            </button>
          </div>
        </>
      )}
    </section>
  )
}
