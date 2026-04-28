# Editar Cursos Importados

**Data:** 2026-04-28
**Status:** Aprovado

## Contexto

Cursos importados são criados com `archivedAt` setado imediatamente, aparecendo no filtro "Finalizados". Atualmente, o único botão disponível para cursos arquivados é "Apagar". O usuário precisa corrigir títulos errados e adicionar participantes esquecidos após a importação.

## Escopo

- Botão "Editar" para cursos importados (arquivados) na lista "Finalizados"
- Modal de importação reutilizado em modo edição, pré-preenchido com dados atuais
- Novo endpoint backend para sincronizar participantes de cursos arquivados

## Permissões

- **Admin:** pode editar qualquer curso arquivado
- **Animador:** pode editar apenas cursos que ele mesmo importou (`created_by === currentUser.id`)
- Mesma lógica do `canManageCourse` já existente para cursos ativos

## Backend

### Endpoint existente (sem mudanças)
`PATCH /api/v1/cursos/:id` — já funciona para metadados sem verificar `archivedAt`.

### Novo endpoint
```
PATCH /api/v1/cursos/:id/participantes
Roles: admin, animador (apenas criador)
Body: { members: [{ member_id: string, status: "attended" | "missed" }] }
```

**Validações:**
- Curso deve existir e ter `archivedAt` não-nulo (só faz sentido para importados/finalizados)
- Permissão: admin ou `created_by === request.user.id`
- Todos os `member_id` devem existir na base
- Sem duplicatas na lista

**Lógica (transaction):**
1. Busca enrollments atuais do curso
2. Compara com o body:
   - **Adiciona** enrollments para membros novos (com status informado)
   - **Remove** enrollments de membros ausentes no body
   - **Atualiza** status de membros cujo status mudou
3. Retorna `{ updated: N }` onde N é o total de participantes após sincronização

### Nova função no store
`syncParticipants(courseId: string, members: Array<{ memberId: string; status: "attended" | "missed" }>): Promise<void>`

Implementada com `prisma.$transaction`:
- `deleteMany` para os removidos
- `createMany` para os adicionados
- `update` individual para os com status alterado

## Frontend

### Lista de cursos — filtro "Finalizados"

Quando `statusFilter === "archived"` e `currentRole === "admin" || course.created_by === currentUser?.id`, exibir botão "Editar" ao lado do "Apagar":

```tsx
<button onClick={() => openEditImportModal(course.id)}>
  <FiEdit2 size={14} /> Editar
</button>
```

### Estado adicional no modal de importação

```ts
const [importEditingId, setImportEditingId] = useState<string | null>(null);
const [importEditingLoading, setImportEditingLoading] = useState(false);
```

### Função `openEditImportModal(courseId: string)`

1. Seta `importEditingId = courseId`
2. Abre o modal (`setImportModalOpen(true)`)
3. Seta `importEditingLoading = true`
4. Chama `GET /api/v1/cursos/:id` para buscar dados + enrollments
5. Pré-preenche todos os campos do modal (título, descrição, data, hora, local, instrutor)
6. Pré-preenche `importParticipants` com os enrollments retornados (usando `member_name` e `status`)
7. Seta `importEditingLoading = false`

### Modal em modo edição

- Título: "Editar Curso Importado" (em vez de "Importar Curso Histórico")
- Botão submit: "Salvar alterações" (em vez de "Importar Curso")
- Corpo do modal: idêntico ao de importação, participantes já listados
- Loading state enquanto busca dados: mostrar spinner ou texto "Carregando..."

### Submit em modo edição (`handleImportSubmit` adaptado)

Quando `importEditingId` é não-nulo:
1. `PATCH /api/v1/cursos/:importEditingId` com metadados (título, descrição, data, local, instrutor)
2. `PATCH /api/v1/cursos/:importEditingId/participantes` com a lista completa de participantes
3. Fecha modal, reseta estado, recarrega lista de cursos
4. Notice de sucesso: "Curso atualizado com sucesso!"

### `resetImportModal` atualizado

Adicionar `setImportEditingId(null)` e `setImportEditingLoading(false)` ao reset.

## Fluxo de dados

```
[Botão Editar] 
  → openEditImportModal(id)
  → GET /api/v1/cursos/:id
  → pré-preenche modal
  → usuário edita campos e participantes
  → submit
  → PATCH /api/v1/cursos/:id (metadados)
  → PATCH /api/v1/cursos/:id/participantes (sync)
  → recarrega lista
```

## Casos de erro

- Falha ao carregar curso para edição: fecha modal, exibe notice de erro
- Falha ao salvar metadados: exibe `importFormError`, não avança para sync de participantes
- Falha ao sincronizar participantes: exibe `importFormError` com mensagem do backend
- Membro não encontrado no backend: retorna 404, exibido como `importFormError`
