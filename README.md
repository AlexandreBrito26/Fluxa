# Fluxa

Dashboard financeiro interativo para pequenos negócios: fluxo de caixa, contas a pagar e a receber, categorias e projeção de saldo. 100% front-end, com dados fictícios salvos no `localStorage`.

## Funcionalidades

- **Visão geral:** saldo atual, entradas/saídas do mês, valores em aberto e vencimentos dos próximos 7 dias
- **Fluxo de caixa:** realizado vs. previsto, filtro de período (6/9/12 meses) e saldo projetado em 30/60/90 dias
- **Contas a pagar / a receber:** CRUD, filtros (status, categoria, período, busca), dar baixa, lançamentos recorrentes e exportação CSV
- **Categorias:** distribuição de despesas e receitas
- **Indicadores:** ticket médio, prazo médio de recebimento e inadimplência
- Tema claro/escuro e layout responsivo

## Stack

React 18 · TypeScript · Vite · Recharts · Zustand (com `persist`)

## Rodando

```bash
npm install
npm run dev
```

Build de produção: `npm run build`.

## Estrutura

```
src/
  components/   telas e gráficos
  data/mock.ts  gerador de dados fictícios (relativos à data de hoje)
  lib/finance.ts  regras de negócio: status, saldo, projeção, indicadores, CSV
  store.ts      estado global (Zustand)
  types.ts
```
