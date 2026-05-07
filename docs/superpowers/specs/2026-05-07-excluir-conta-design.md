# Spec: Excluir Conta Permanentemente

**Data:** 2026-05-07  
**Status:** Aprovado

## Contexto

Usuários da plataforma (recreadores, animadores, admins) precisam poder excluir sua própria conta de forma autônoma. A ação é irreversível e apaga todos os dados vinculados ao usuário no sistema.

## Escopo

- Botão "Excluir minha conta" na aba **Segurança** de Configurações
- Modal de confirmação com overlay e verificação de senha
- Novo endpoint backend para auto-exclusão com confirmação de senha
- Redirecionamento para `/login` após exclusão

Fora do escopo: notificação por e-mail pós-exclusão, período de graça, exclusão por admins via este fluxo (já existe rota separada).

## Backend

### Novo endpoint: `DELETE /api/v1/membros/:id/conta`

**Arquivo:** `backend/src/membros/routes.ts`

**Autorização:** usuário autenticado cujo `request.user.id === params.id` (somente auto-exclusão).

**Body:**
```json
{ "password": "string" }
```

**Fluxo:**
1. Valida que `params.id` existe e que o usuário autenticado é o próprio (`403` caso contrário)
2. Busca o membro pelo id (`404` se não encontrado)
3. Verifica a senha com `verifyPassword(password, member.passwordHash)` — retorna `400` com `"invalid_password"` se incorreta
4. Chama `deleteUser(params.id)` (já existente em `auth/store.ts`) — apaga o usuário e todos os dados em cascata via Prisma
5. Registra `MEMBER_SELF_DELETED` no audit log
6. Retorna `204 No Content`

**Erros:**
| Código | `error` | Situação |
|--------|---------|----------|
| 400 | `invalid_request` | Body inválido |
| 400 | `invalid_password` | Senha incorreta |
| 401 | `unauthorized` | Token ausente |
| 403 | `forbidden` | Tentativa de excluir outra conta |
| 404 | `not_found` | Membro não encontrado |

**Nota:** mantemos o endpoint existente `DELETE /api/v1/membros/:id` (admin-only, sem senha) intacto. Este é um endpoint paralelo para auto-exclusão com verificação de identidade por senha.

## Frontend

### API helper — `frontend/lib/api.ts`

Adicionar função:
```ts
export async function deleteSelfAccount(id: string, password: string) {
  return request(`/membros/${id}/conta`, {
    method: "DELETE",
    body: JSON.stringify({ password }),
  });
}
```

### Aba Segurança — `frontend/app/configuracoes/seguranca/page.tsx`

**Zona de perigo** após o card de senha, separada por margem superior. Card com borda vermelha suave contendo:
- Título: "Zona de perigo"
- Descrição curta sobre irreversibilidade
- Botão vermelho outline: "Excluir minha conta"

Ao clicar no botão → abre modal.

**Modal com overlay:**
- Overlay: `position: fixed`, `inset: 0`, fundo `rgba(0,0,0,0.5)`, `z-index` alto
- Card centralizado (max-width ~440px) com:
  - Ícone de alerta vermelho
  - Título: "Excluir conta permanentemente"
  - Texto explicativo: "Esta ação não pode ser desfeita. Seu perfil, cursos, advertências e todos os dados relacionados serão apagados para sempre."
  - Campo `<input type="password">` com label "Digite sua senha para confirmar"
  - Botão "Cancelar" (neutro, fecha modal, limpa campo)
  - Botão "Excluir minha conta" (vermelho, desabilitado enquanto senha vazia ou durante loading)
  - Mensagem de erro inline se senha incorreta ou falha de rede

**Estados do modal:**
- `idle` — campo senha vazio, botão excluir desabilitado
- `typing` — senha preenchida, botão excluir habilitado
- `loading` — chamada em andamento, ambos botões desabilitados, texto "Excluindo..."
- `error` — exibe mensagem de erro, usuário pode tentar novamente

**Após sucesso:**
1. Limpa `localStorage` (token e dados do usuário)
2. Redireciona para `/login`

**Acessibilidade:**
- `role="dialog"` e `aria-modal="true"` no card
- `aria-label` descritivo
- Foco movido para o campo de senha ao abrir
- `Escape` fecha o modal

## Dados apagados

Tudo que `deleteUser` já faz em cascata via Prisma: usuário, matrícula em cursos, advertências, feedbacks, habilidades, foto no R2 (se existir).

## Fluxo completo

```
[Aba Segurança] → clica "Excluir minha conta"
  → abre modal com overlay
  → digita senha
  → clica "Excluir minha conta"
  → POST DELETE /api/v1/membros/:id/conta { password }
    → senha correta → deleteUser → 204
      → limpa localStorage → redireciona /login
    → senha incorreta → erro "Senha incorreta" no modal
```
