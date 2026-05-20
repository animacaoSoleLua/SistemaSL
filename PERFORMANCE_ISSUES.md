# Problemas de Performance — Relatórios

## Resumo

Os gargalos não precisam de Redis. São bugs de código: queries desnecessárias e filtros feitos na memória em vez de no banco.

---

## Problema 1 — Criar relatório faz 3 viagens ao banco

**Arquivo:** `backend/src/relatorios/store.ts` — função `createReport`

### O que acontece
Ao criar um relatório, o código faz:
1. `INSERT` no banco (cria o relatório)
2. `UPDATE` com SQL raw pra salvar campos extras (uber, equipe, dificuldades...)
3. `SELECT` com SQL raw pra ler esses mesmos campos de volta

### Por que isso é errado
O schema do Prisma (`prisma/schema.prisma`) já tem **todos** esses campos mapeados no modelo `Report`. O Prisma consegue salvar e ler tudo numa única operação. O código foi escrito como se esses campos não existissem no Prisma, então faz UPDATE e SELECT manual em cima — trabalho completamente desnecessário.

### Gargalo causado
Toda criação de relatório faz 3 roundtrips ao banco em vez de 1. No pior caso, se o banco estiver sobrecarregado, cada um pode levar ~50ms, somando ~150ms só nessa etapa.

### Correção
Passar todos os campos diretamente no `prisma.report.create()` e remover as funções `updateReportExtraFields` e `getReportExtraFields`. O resultado é uma única query.

---

## Problema 2 — Buscar relatório por ID faz 2 viagens ao banco

**Arquivo:** `backend/src/relatorios/store.ts` — função `getReportById`

### O que acontece
Ao abrir um relatório:
1. `SELECT` com Prisma pra buscar o relatório completo
2. `SELECT` com SQL raw pra buscar os "campos extras" do mesmo relatório

### Por que isso é errado
Mesma causa do Problema 1: o `findUnique` do Prisma já retorna **todos** os campos, incluindo os "extras". O segundo SELECT é uma repetição desnecessária.

### Gargalo causado
Toda visualização de relatório faz 2 queries ao banco em vez de 1.

### Correção
Remover a chamada `getReportExtraFields` após o `findUnique`. O Prisma já traz tudo.

---

## Problema 3 — Listagem carrega TODOS os relatórios na memória

**Arquivos:** `store.ts` — `listReports` / `routes.ts` — `GET /api/v1/relatorios`

### O que acontece
Ao abrir a lista de relatórios:
1. O banco retorna **todos** os relatórios (sem filtro, sem limite)
2. O código JavaScript filtra por autor, período e busca na memória
3. A paginação (página 1, 2, 3...) também é feita em JavaScript

### Por que isso é errado
O banco de dados é otimizado pra filtrar e paginar. Fazer isso em JavaScript significa trazer dados que serão jogados fora. Com 500 relatórios, o banco envia os 500 pro servidor, o servidor descarta 480 e devolve só 20 pro frontend.

### Gargalo causado
- Tráfego desnecessário entre banco e servidor
- Uso alto de memória no servidor
- Quanto mais relatórios existirem, mais lento fica — escala mal

### Correção
Passar os filtros e a paginação pro Prisma usando `where`, `skip` e `take`. O banco retorna só o que o frontend precisa.

---

## Problema 4 — Listagem gera URLs assinadas pra todas as mídias

**Arquivo:** `backend/src/relatorios/routes.ts` — `GET /api/v1/relatorios`

### O que acontece
Na listagem de relatórios, pra cada relatório na página, o código gera uma URL assinada (presigned URL) pra cada foto/vídeo chamando o serviço R2/S3.

### Por que isso é errado
Se a página tem 20 relatórios com 5 mídias cada, isso gera **100 chamadas de rede** ao R2 antes de responder o frontend. Cada chamada tem latência.

### Gargalo causado
Resposta lenta na listagem proporcional ao número de mídias. Quanto mais fotos/vídeos nos relatórios da página, mais lento.

### Correção
Na **listagem**, não retornar URLs presignadas — retornar apenas a `key` ou um endpoint próprio que gera a URL sob demanda. URLs presignadas completas só fazem sentido ao abrir um relatório específico.

---

## Ordem de prioridade

| # | Problema | Impacto | Dificuldade |
|---|----------|---------|-------------|
| 1 | Criar relatório — 3 queries | Alto | Baixa |
| 2 | Ver relatório — 2 queries | Médio | Baixa |
| 3 | Listagem na memória | Alto (cresce com o tempo) | Média |
| 4 | Presigned URLs na listagem | Médio | Média |
