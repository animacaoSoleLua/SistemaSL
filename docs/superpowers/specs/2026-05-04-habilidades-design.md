# Design: Funcionalidade de Habilidades

**Data:** 2026-05-04  
**Status:** Aprovado

## Visão Geral

Nova funcionalidade para cadastrar habilidades (ex: Pintura, Balão, Malabarismo), associá-las a membros com uma nota de 1 a 10, e visualizar quais membros possuem cada habilidade e com qual proficiência.

## Modelo de Dados

Dois novos modelos Prisma:

```prisma
model Skill {
  id          String        @id @default(uuid()) @db.Uuid
  name        String        @unique @db.VarChar(100)
  description String?       @db.Text
  createdAt   DateTime      @default(now()) @map("created_at")
  members     MemberSkill[]

  @@map("skills")
}

model MemberSkill {
  id        String   @id @default(uuid()) @db.Uuid
  memberId  String   @map("member_id") @db.Uuid
  skillId   String   @map("skill_id") @db.Uuid
  rating    Int
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  member    User     @relation(fields: [memberId], references: [id], onDelete: Cascade)
  skill     Skill    @relation(fields: [skillId], references: [id], onDelete: Cascade)

  @@unique([memberId, skillId])
  @@map("member_skills")
}
```

**Restrições:**
- `rating` aceita inteiros de 1 a 10 (validado no backend e no frontend)
- Um membro pode ter múltiplas habilidades, mas cada habilidade aparece só uma vez por membro (unique memberId+skillId)
- Deletar uma habilidade remove todos os `MemberSkill` associados via cascade

## Backend

Novo módulo `habilidades` em `backend/src/habilidades/`. Todas as rotas restritas a `admin`.

### Rotas

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/habilidades` | Lista todas as habilidades com membros e notas |
| POST | `/habilidades` | Cria habilidade |
| PUT | `/habilidades/:id` | Edita nome/descrição |
| DELETE | `/habilidades/:id` | Deleta habilidade |
| POST | `/habilidades/:id/membros` | Adiciona habilidade a membro |
| PUT | `/habilidades/:id/membros/:memberId` | Atualiza nota do membro |
| DELETE | `/habilidades/:id/membros/:memberId` | Remove habilidade do membro |

### Formato de resposta `GET /habilidades`

```json
[
  {
    "id": "uuid",
    "name": "Pintura",
    "description": "Pintura artística e corporal",
    "members": [
      { "id": "uuid", "name": "Ana", "photo_url": null, "rating": 9 },
      { "id": "uuid", "name": "João", "photo_url": null, "rating": 6 }
    ]
  }
]
```

Os membros dentro de cada habilidade são ordenados por `rating DESC`.

### Integração com membros

A rota existente `GET /membros/:id` passa a incluir um campo `skills` no retorno:

```json
"skills": [
  { "id": "uuid", "name": "Pintura", "rating": 9 },
  { "id": "uuid", "name": "Balão", "rating": 6 }
]
```

Ordenado por `rating DESC`.

## Frontend

### Nova página `/habilidades`

- Acesso: somente `admin`
- Ícone no menu lateral: `FiStar`
- Arquivo: `frontend/app/habilidades/page.tsx`

**Layout:**

```
[Habilidades]                [Nova Habilidade] [Adicionar a Membro]

▼ Pintura (3 membros)                          [Editar] [Deletar]
   Foto  Nome    Nota   Ação
   ...   Ana      9    [✏️] [🗑️]
   ...   Carlos   7    [✏️] [🗑️]
   ...   João     6    [✏️] [🗑️]

▶ Balão (2 membros)                            [Editar] [Deletar]
▶ Malabarismo (0 membros)                      [Editar] [Deletar]
```

**Estados:**
- Carregando: spinner/skeleton
- Vazio: "Nenhuma habilidade cadastrada ainda."
- Erro de carregamento: mensagem de erro inline

### Modais

**Criar/Editar Habilidade:**
- Campo: Nome (obrigatório, máx 100 chars)
- Campo: Descrição (opcional, textarea)
- Botão confirmar / cancelar

**Adicionar/Editar Habilidade a Membro:**
- Select: Habilidade (lista das habilidades existentes)
- Select: Membro (lista dos membros ativos)
- Select/Slider: Nota (1 a 10)
- Ao editar: habilidade e membro são fixos, apenas nota é alterável

**Confirmar exclusão (habilidade ou vínculo membro-habilidade):**
- Modal de confirmação simples: "Tem certeza que deseja remover?"

### Aba "Habilidades" nos detalhes do membro (`/usuarios`)

Nova aba `"habilidades"` no modal de detalhes:
- Lista: nome da habilidade + nota, ordenada por rating DESC
- Somente leitura (sem edição inline — a edição ocorre pela página /habilidades)
- Estado vazio: "Nenhuma habilidade registrada para este membro."

## Tratamento de Erros

| Situação | Resposta backend | Mensagem no frontend |
|----------|-----------------|----------------------|
| Nome de habilidade duplicado | 409 | "Já existe uma habilidade com esse nome" |
| Membro já possui essa habilidade | 409 | "Esse membro já possui essa habilidade" |
| Rating fora de 1–10 | 400 | Bloqueado no frontend antes de submeter |
| Deletar habilidade com membros | Permitido (cascade) | Confirmação antes de deletar |
| Erro de rede/servidor | 500 | Mensagem inline no modal |

## Arquivos a Criar/Modificar

**Backend:**
- `backend/prisma/schema.prisma` — adicionar modelos `Skill` e `MemberSkill`
- `backend/prisma/migrations/...` — nova migration
- `backend/src/habilidades/routes.ts` — novo módulo
- `backend/src/habilidades/store.ts` — queries Prisma
- `backend/src/app.ts` — registrar novo módulo
- `backend/src/membros/routes.ts` — incluir `skills` no GET de membro

**Frontend:**
- `frontend/app/habilidades/page.tsx` — nova página
- `frontend/app/habilidades/page.css` — estilos
- `frontend/app/components/SidebarNav.tsx` — adicionar item "Habilidades"
- `frontend/lib/api.ts` — adicionar funções de API de habilidades
- `frontend/app/usuarios/page.tsx` — adicionar aba "habilidades" no modal de detalhes
