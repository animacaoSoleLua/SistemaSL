# Feature: Ver Inscritos em Cursos

**Data:** 2026-04-14  
**Status:** Design aprovado

---

## Visão Geral

Adicionar funcionalidade para visualizar lista de inscritos em um curso. Os usuários poderão clicar em um botão "Ver inscritos" ao lado dos botões de editar/apagar, que abrirá um modal com a lista de nomes dos inscritos, com capacidade de busca e filtro.

---

## Requisitos

### Funcionais

1. **Botão "Ver inscritos"**: Disponível em cada linha de curso, ao lado dos botões editar/apagar
2. **Modal de inscritos**: Exibe lista de nomes completos de inscritos
3. **Busca**: Campo de busca que filtra a lista em tempo real (case-insensitive)
4. **Ordenação**: Lista ordenada alfabeticamente por nome completo
5. **Permissões**: Todos os usuários podem ver a lista (sem restrições)
6. **Somente leitura**: Modal é apenas visualização, sem ações adicionais

### Não-Funcionais

1. **Performance**: Uso de lazy loading - dados carregados apenas ao abrir o modal
2. **UX**: Sem sobrecarga na carga inicial da página de cursos
3. **Escalabilidade**: Suporta cursos com qualquer número de inscritos

---

## Design Técnico

### 1. Frontend - Componentes

#### Botão "Ver Inscritos"
- **Localização**: Linha de cada curso, entre botão editar e apagar
- **Ícone**: `FiUsers` (do react-icons) ou similar
- **Ação ao clicar**: Dispara `handleViewEnrolled(courseId)` que abre o modal
- **Comportamento**: Desabilitado para cursos sem inscritos (opcional, ou sempre ativo)

#### Modal de Inscritos
- **Estado global**: 
  ```typescript
  {
    enrolledMembersModal: {
      isOpen: boolean,
      courseId: string | null,
      members: Array<{ id: string, name: string }>,
      loading: boolean,
      error: string | null,
      searchTerm: string
    }
  }
  ```

- **Estrutura**:
  ```
  ┌─────────────────────────────────┐
  │ Inscritos no Curso: [Título]  X │
  ├─────────────────────────────────┤
  │ 🔍 [Campo de busca]             │
  ├─────────────────────────────────┤
  │ • João da Silva                 │
  │ • Maria Santos                  │
  │ • Pedro Oliveira                │
  │ • [mais inscritos...]           │
  └─────────────────────────────────┘
  ```

- **Campo de Busca**:
  - Filtra em tempo real conforme digita
  - Case-insensitive
  - Busca em nome completo
  - Placeholder: "Buscar por nome..."

- **Lista**:
  - Renderizada em ordem alfabética
  - Um inscrito por linha
  - Simples visualização (sem links, botões ou ações)
  - Loading state: Spinner enquanto carrega
  - Error state: Mensagem de erro se falhar

#### Integração com Página Existente
- Reutilizar estrutura de modal existente em `cursos/page.tsx`
- Usar padrão de estados já em uso (`viewModalOpen`, `viewLoading`, etc.)
- Seguir convenção de nomes de handlers (`handleViewEnrolled`)

---

### 2. Backend - API

#### Novo Endpoint
```
GET /api/courses/:courseId/enrollments
```

**Parâmetros:**
- `courseId` (URL param): ID do curso

**Resposta (200 OK):**
```json
{
  "enrollments": [
    { "id": "uuid-1", "name": "João da Silva" },
    { "id": "uuid-2", "name": "Maria Santos" }
  ]
}
```

**Resposta (404 Not Found):**
```json
{
  "error": "Curso não encontrado"
}
```

**Comportamento:**
- Retorna apenas `id` e `name` (dados de inscritos)
- Sem controle de acesso (todos podem acessar)
- Sem paginação (retorna lista completa)
- Nome já vem do banco em ordem como está, frontend ordena alfabeticamente

---

### 3. Fluxo de Dados

```
[Frontend - Página de Cursos]
         ↓
   [Usuário clica "Ver inscritos"]
         ↓
[handleViewEnrolled(courseId)]
         ↓
[Modal abre com isOpen=true, loading=true]
         ↓
[Chama getEnrolledMembers(courseId)]
         ↓
[GET /api/courses/:courseId/enrollments]
         ↓
[Backend retorna list de inscritos]
         ↓
[Frontend ordena alfabeticamente]
         ↓
[Modal renderiza lista com campo de busca]
         ↓
[Usuário digita para buscar]
         ↓
[Lista filtra em tempo real]
```

---

## Implementação

### Arquivos a Criar/Modificar

**Frontend:**
- `frontend/app/cursos/page.tsx`
  - Adicionar estado para modal de inscritos
  - Adicionar botão "Ver inscritos" em cada linha
  - Adicionar modal com campo de busca e lista
  - Adicionar handler `handleViewEnrolled()`
  - Integrar chamada à API `getEnrolledMembers()`

- `frontend/lib/api.ts`
  - Adicionar função `getEnrolledMembers(courseId)` que chama `GET /api/courses/:courseId/enrollments`

**Backend:**
- `backend/src/courses/routes.ts` (ou arquivo equivalente)
  - Adicionar rota `GET /api/courses/:courseId/enrollments`
  - Query do banco para retornar inscritos do curso

---

## Casos de Uso

### Caso 1: Usuário visualiza inscritos com sucesso
1. Usuário na página de cursos vê um curso
2. Clica em "Ver inscritos"
3. Modal abre com loading
4. API retorna lista de inscritos
5. Modal mostra nomes em ordem alfabética
6. Usuário pode buscar por nome
7. Clica X ou fora do modal para fechar

### Caso 2: Usuário busca um inscrito específico
1. Modal aberto com lista completa
2. Digita nome no campo de busca
3. Lista filtra em tempo real, mostrando apenas inscritos que batem
4. Se nenhum bater, mostra mensagem "Nenhum resultado"
5. Limpa a busca, volta à lista completa

### Caso 3: Curso sem inscritos
1. Usuário clica "Ver inscritos"
2. Modal abre
3. Mostra mensagem "Nenhum inscrito ainda" ou lista vazia

---

## Notas Técnicas

- A busca deve ser feita **no frontend** (não chamar API a cada digitar)
- A ordenação alfabética é feita **no frontend** após receber a resposta
- Modal deve fechar ao pressionar ESC
- Modal deve fechar ao clicar fora (backdrop)
- Reutilizar CSS/estilos existentes para consistência

---

## Próximas Etapas

1. ✅ Design aprovado
2. Criar plano de implementação
3. Implementar backend (endpoint API)
4. Implementar frontend (botão, modal, busca)
5. Testar casos de uso
6. Merge para main
