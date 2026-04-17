# Design: Aba de Gerência (Relatórios Gerenciais)

**Data:** 2026-04-10  
**Status:** Aprovado

---

## Contexto

O sistema SistemaSL precisa de uma aba de gestão administrativa onde o `admin` pode visualizar dados consolidados sobre membros, relatórios de eventos e cursos, além de gerar PDFs desses dados para uso gerencial.

---

## Rota e Acesso

- **Rota:** `/gerencia`
- **Roles permitidos:** apenas `admin`
- **Navegação:** novo item no `navItems` do `SidebarNav.tsx` com ícone `FiBarChart2` (ou similar), posicionado após "Dashboard"

---

## Estrutura da Página

Layout vertical com painel único (`/gerencia/page.tsx`). Sem sub-rotas.

### 1. Cards de Resumo (topo)

Quatro cards estáticos calculados automaticamente com dados atuais (sem filtro manual):

| Card | Dado |
|---|---|
| Total de membros | Contagem de todos os usuários cadastrados |
| Menores de 18 anos | Contagem + percentual de membros com `birth_date` que resulte em idade < 18 |
| Relatórios este mês | Contagem de relatórios com `event_date` no mês/ano atual |
| Cursos este mês | Contagem de cursos com `course_date` no mês/ano atual |

Os cards são apenas leitura, sem filtros e sem PDF.

### 2. Seção: Relação de Membros

- **Filtro:** select de role — "Todos", "Admin", "Animador", "Recreador"
- **Tabela:** Nome completo (`name + lastName`), CPF, Data de nascimento (formato BR), Idade calculada, Função
- **Botão:** "Gerar PDF" — dispara download do PDF com os dados filtrados atualmente na tela
- **Fonte de dados:** `GET /membros?role=X&limit=1000` (sem paginação para o relatório completo)

### 3. Seção: Relatórios de Eventos por Mês

- **Filtro:** seletor de mês (1–12) + seletor de ano (ano atual e anteriores)
- **Contador:** "X relatórios encontrados"
- **Tabela:** Data do evento, Contratante, Local, Autor
- **Botão:** "Gerar PDF" — dispara download com os dados do período selecionado
- **Fonte de dados:** `GET /relatorios?period_start=YYYY-MM-01&period_end=YYYY-MM-DD`

### 4. Seção: Cursos por Mês

- **Filtro:** seletor de mês + seletor de ano
- **Contador:** "X cursos encontrados"
- **Tabela:** Nome do curso, Data, Instrutor, Capacidade total
- **Botão:** "Gerar PDF"
- **Fonte de dados:** `GET /cursos?period_start=YYYY-MM-01&period_end=YYYY-MM-DD` (novo filtro a adicionar)

---

## Geração de PDFs

- **Biblioteca:** `@react-pdf/renderer` (client-side, sem novo endpoint no backend)
- **Instalação:** `npm install @react-pdf/renderer` no frontend
- **Cada PDF contém:**
  - Cabeçalho: logo da empresa + título do relatório + data de geração
  - Linha de filtros aplicados (ex: "Função: Animador" ou "Período: Março/2026")
  - Tabela com as mesmas colunas da tela
  - Rodapé: número de página + total de registros
- **Trigger:** botão "Gerar PDF" em cada seção chama `pdf(<Documento />).toBlob()` e cria um link de download

---

## Mudanças no Backend

### `backend/src/cursos/routes.ts`
Adicionar suporte a `period_start` e `period_end` na query do `GET /cursos`, espelhando o padrão já existente em `relatorios/routes.ts`:
- Filtrar cursos onde `course_date >= period_start AND course_date <= period_end`

### Nenhuma outra mudança no backend necessária
- `/membros?role=X` já retorna `cpf` e `birth_date`
- `/relatorios?period_start=&period_end=` já existe

---

## Mudanças no Frontend

### `frontend/lib/api.ts`
1. Atualizar `getReports()` para aceitar `period_start` e `period_end` opcionais
2. Atualizar `getCourses()` para aceitar `period_start` e `period_end` opcionais
3. Adicionar `getMembersReport(role?: string)` com `limit=1000` para busca sem paginação

### `frontend/app/components/SidebarNav.tsx`
- Adicionar item ao `navItems` para `/gerencia` com role `["admin"]`
- Adicionar `isActive` handler para `/gerencia`

### `frontend/app/gerencia/page.tsx` (novo arquivo)
- Página principal com os 4 cards + 3 seções descritas acima
- Verificação de role admin no lado cliente (redirect se não for admin)

### `frontend/app/gerencia/page.css` (novo arquivo)
- Estilos da página seguindo o padrão do projeto (variáveis CSS existentes)

### `frontend/app/gerencia/pdf/MembersPdf.tsx` (novo arquivo)
- Componente `@react-pdf/renderer` para o PDF de membros

### `frontend/app/gerencia/pdf/ReportsPdf.tsx` (novo arquivo)
- Componente `@react-pdf/renderer` para o PDF de relatórios de eventos

### `frontend/app/gerencia/pdf/CoursesPdf.tsx` (novo arquivo)
- Componente `@react-pdf/renderer` para o PDF de cursos

---

## Relatórios Futuros (fora de escopo agora)

Dados disponíveis no sistema que permitem relatórios adicionais:

| Relatório | Fonte de dados |
|---|---|
| Advertências por membro no período | Tabela `warnings` com filtro de data |
| Taxa de presença em cursos | `CourseEnrollment` com `status` (enrolled/attended/missed) |
| Eventos fora de Brasília | `Report.outsideBrasilia = true` |
| Membros por região | `User.region` |
| Feedbacks de clientes por período | Tabela `ClientFeedback` |
| Membros com suspensão ativa | Tabela `Suspension` |

---

## Fora de Escopo

- Nenhum relatório para roles `animador` ou `recreador`
- Sem sub-rotas (tudo em `/gerencia`)
- Sem modo de edição ou ação sobre os dados exibidos
- Sem filtros nos cards de resumo do topo
