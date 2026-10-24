# Fluxa

Dashboard financeiro interativo para pequenos negócios: fluxo de caixa, contas a pagar e a receber, categorias e projeção de saldo. 100% front-end, com dados fictícios salvos no `localStorage`.

## Funcionalidades

- **Visão geral:** saldo atual, entradas/saídas do mês, valores em aberto e vencimentos dos próximos 7 dias
- **Fluxo de caixa:** realizado vs. previsto, filtro de período (6/9/12 meses) e saldo projetado em 30/60/90 dias
- **Contas a pagar / a receber:** CRUD, filtros (status, categoria, período, busca), dar baixa, lançamentos recorrentes e exportação CSV
- **Categorias:** distribuição de despesas e receitas
- **Metas:** limite mensal por categoria de despesa, com barra de progresso, alerta a partir de 80% e aviso de meta estourada
- **Indicadores:** ticket médio, prazo médio de recebimento e inadimplência
- Tema claro/escuro e layout responsivo

- **Importar extrato (CSV):** reconhece delimitador (`;`, `,` ou tab), datas e valores no formato brasileiro, colunas de Débito/Crédito e arquivos em UTF-8 ou Windows-1252. Categoriza automaticamente, sinaliza possíveis duplicados e mostra uma prévia editável antes de importar

## Stack

React 18 · TypeScript · Vite · Recharts · Zustand (com `persist`)

## Rodando

```bash
npm install
npm run dev
```

Build de produção: `npm run build`.

## Performance

- Abas carregadas sob demanda (`React.lazy` + `Suspense`)
- React e Recharts em chunks separados (melhor cache entre deploys)
- Bundle inicial caiu de um único arquivo de ~610 kB para chunks menores, sem o aviso de tamanho do Vite

## Testes

```bash
npm test          # roda uma vez
npm run test:watch
```

As regras de negócio em `src/lib/finance.ts` (status, saldo, projeção, indicadores, série mensal e CSV) são cobertas com Vitest, usando data fixa para os resultados serem determinísticos.

## Estrutura

```
src/
  components/   telas e gráficos
  data/mock.ts  gerador de dados fictícios (relativos à data de hoje)
  lib/finance.ts  regras de negócio: status, saldo, projeção, indicadores, CSV
  store.ts      estado global (Zustand)
  types.ts
```
