# Design: Permissões Extras por Membro

**Data:** 2026-05-13  
**Status:** Aprovado

## Contexto

O sistema atual controla acesso via três roles fixos (`admin`, `animador`, `recreador`). Não há como conceder acesso pontual a uma funcionalidade restrita sem promover o membro de role. Este design adiciona um sistema de permissões extras que o admin pode conceder e revogar individualmente por membro.

## Funcionalidades cobertas

Apenas funcionalidades com restrição de role entram no sistema de permissões. As que já são acessíveis a todos os roles (`cursos`, `membros`, `perfil`) não são incluídas.

| Permissão       | Rota           | Roles com acesso padrão |
|-----------------|----------------|-------------------------|
| `dashboard`     | /dashboard     | admin                   |
| `gerencia`      | /gerencia      | admin                   |
| `relatorios`    | /relatorios    | admin, animador         |
| `advertencias`  | /advertencias  | admin, animador         |
| `feedbacks`     | /feedbacks     | admin                   |
| `habilidades`   | /habilidades   | admin                   |

## Modelo de dados

Novo enum e model no Prisma (`backend/prisma/schema.prisma`):

```prisma
enum Permission {
  dashboard
  gerencia
  relatorios
  advertencias
  feedbacks
  habilidades
}

model UserPermission {
  id          String     @id @default(uuid())
  userId      String
  permission  Permission
  grantedById String
  grantedAt   DateTime   @default(now())

  user      User @relation("UserPermissions", fields: [userId], references: [id], onDelete: Cascade)
  grantedBy User @relation("GrantedPermissions", fields: [grantedById], references: [id])

  @@unique([userId, permission])
}
```

- `@@unique([userId, permission])` impede duplicatas.
- `onDelete: Cascade` limpa as permissões quando o usuário é deletado.
- `grantedById` mantém registro de quem concedeu a permissão.

O model `User` recebe duas novas relações:

```prisma
permissions        UserPermission[] @relation("UserPermissions")
permissionsGranted UserPermission[] @relation("GrantedPermissions")
```

## Backend

### Novas rotas

Registradas em `backend/src/membros/routes.ts`, ambas exigem role `admin`:

```
GET  /membros/:id/permissoes
PUT  /membros/:id/permissoes   body: { permissions: Permission[] }
```

- `GET` retorna a lista de permissões extras do membro.
- `PUT` substitui todas as permissões do membro atomicamente (delete + insert em transação). O cliente envia a lista completa de permissões desejadas.

### Auth guard

`backend/src/auth/guard.ts` passa a carregar as permissões extras do usuário autenticado a cada request:

```ts
request.user = {
  id, name, role,
  permissions: await loadUserPermissions(id) // string[]
}
```

`AuthUser` em `backend/src/auth/store.ts` ganha o campo `permissions: string[]`.

### Middleware de acesso

Nova função `requireAccess` em `backend/src/auth/guard.ts`:

```ts
function requireAccess(roles: Role[], permission?: Permission) {
  return async (request, reply) => {
    if (roles.includes(request.user.role)) return
    if (permission && request.user.permissions.includes(permission)) return
    reply.code(403).send({ error: 'Forbidden' })
  }
}
```

`requireRole` permanece sem alteração. As rotas afetadas trocam para `requireAccess`:

- `GET/POST /feedbacks` → `requireAccess(["admin"], "feedbacks")`
- `GET /dashboard` → `requireAccess(["admin"], "dashboard")`
- `GET /gerencia` → `requireAccess(["admin"], "gerencia")`
- `GET /relatorios` → `requireAccess(["admin", "animador"], "relatorios")`
- `POST/PATCH/DELETE /advertencias` → `requireAccess(["admin", "animador"], "advertencias")`
- `GET/POST/PATCH/DELETE /habilidades` → `requireAccess(["admin"], "habilidades")`

## Frontend

### SidebarNav

`frontend/app/components/SidebarNav.tsx`: cada item do `navItems` ganha um campo `permission` opcional:

```ts
const navItems = [
  { label: "Dashboard",    href: "/dashboard",    roles: ["admin"],                          permission: "dashboard"    },
  { label: "Gerência",     href: "/gerencia",     roles: ["admin"],                          permission: "gerencia"     },
  { label: "Relatorios",   href: "/relatorios",   roles: ["admin", "animador"],               permission: "relatorios"   },
  { label: "Advertências", href: "/advertencias", roles: ["admin", "animador"],               permission: "advertencias" },
  { label: "Feedbacks",    href: "/feedbacks",    roles: ["admin"],                          permission: "feedbacks"    },
  { label: "Habilidades",  href: "/habilidades",  roles: ["admin"],                          permission: "habilidades"  },
  { label: "Membros",      href: "/usuarios",     roles: ["admin", "animador", "recreador"]                             },
  { label: "Perfil",       href: "/configuracoes",roles: ["admin", "animador", "recreador"]                             },
]
```

Filtragem atualizada:

```ts
.filter(item =>
  item.roles.includes(user.role) ||
  (item.permission && user.permissions?.includes(item.permission))
)
```

### StoredUser

`frontend/lib/auth.ts`: `StoredUser` ganha `permissions: string[]`. O campo é populado após login a partir da resposta do backend (que já carrega as permissões do usuário).

### Botão na listagem de membros

Em `frontend/app/usuarios/page.tsx`, ao lado do CPF de cada membro na lista, aparece um botão ícone (ex: `FiShield`) visível apenas para admin. Ao clicar, abre o `PermissoesModal` para aquele membro.

### PermissoesModal

Novo componente em `frontend/app/usuarios/PermissoesModal.tsx`:

- **Ao abrir:** faz `GET /membros/:id/permissoes` e pré-marca os checkboxes com as permissões atuais.
- **Checkboxes:** um por permissão da lista acima, com label legível ("Feedbacks", "Dashboard", etc.).
- Permissões que o role do membro já possui por padrão aparecem marcadas e desabilitadas — não faz sentido sobrescrever o que o role já concede.
- **Salvar:** faz `PUT /membros/:id/permissoes` com a lista completa de permissões marcadas e fecha o modal.
- **Cancelar:** fecha sem salvar.

## Fluxo completo

1. Admin abre a lista de membros em `/usuarios`.
2. Clica no botão de permissões ao lado do CPF de um membro.
3. Modal abre, checkboxes carregam as permissões atuais.
4. Admin marca/desmarca permissões e clica em "Salvar".
5. Backend faz delete+insert atômico das permissões.
6. Na próxima vez que o membro fizer login, o sessionStorage é populado com as novas permissões e o sidebar exibe os itens correspondentes.
