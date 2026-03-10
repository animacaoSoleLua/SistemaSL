# Sprint 4 — Performance

**Prioridade:** Alta
**Status:** Concluída

---

## Objetivo

Reduzir o tempo de carregamento das páginas, eliminar operações desnecessariamente custosas no backend e melhorar a experiência percebida pelo usuário.

---

## Tarefas

### AUD-P4-01 — Mover filtros e paginação de advertências para o banco

**Severidade:** Crítica
**Arquivos:** `backend/src/advertencias/routes.ts`, `backend/src/advertencias/store.ts`

**Problema:**
O sistema carrega TODAS as advertências do banco, filtra e pagina em memória (JavaScript). Com grande volume de dados, isso é lento e desperdiça memória.

```typescript
// ❌ Atual — filtra tudo em JS
let warnings = await listWarnings(); // SELECT * FROM Warning
if (query.member_id) {
  warnings = warnings.filter(w => w.memberId === query.member_id);
}
const paged = warnings.slice((page-1)*limit, page*limit);
```

**Solução:**
```typescript
// ✅ Filtrar e paginar no banco
// backend/src/advertencias/store.ts
export async function listWarnings(params: {
  memberId?: string;
  page: number;
  limit: number;
}) {
  const where = params.memberId ? { memberId: params.memberId } : {};

  const [warnings, total] = await prisma.$transaction([
    prisma.warning.findMany({
      where,
      skip: (params.page - 1) * params.limit,
      take: params.limit,
      orderBy: { warning_date: "desc" },
      select: {
        id: true,
        reason: true,
        warning_date: true,
        memberId: true,
        member: { select: { name: true } },
      },
    }),
    prisma.warning.count({ where }),
  ]);

  return { warnings, total, pages: Math.ceil(total / params.limit) };
}
```

**Critérios de Conclusão:**
- [ ] `listWarnings` aceita `memberId`, `page`, `limit` como parâmetros
- [ ] Query usa `WHERE`, `SKIP`, `TAKE` no banco (não em memória)
- [ ] `count` retornado para paginação correta no frontend
- [ ] Testes de advertência atualizados
- [ ] Mesmo padrão aplicado a listagem de relatórios se aplicável

---

### AUD-P4-02 — Adicionar compression middleware no backend

**Severidade:** Alta
**Arquivos:** `backend/src/app.ts`

**Problema:**
Respostas JSON do backend não são comprimidas. Em redes lentas, payloads grandes (listas de membros, relatórios) são transferidos sem compressão.

**Solução:**
```bash
cd backend && npm install @fastify/compress
```

```typescript
// ✅ app.ts
import compress from "@fastify/compress";

app.register(compress, {
  global: true,
  threshold: 1024, // comprimir respostas > 1KB
  encodings: ["gzip", "deflate"],
});
```

**Critérios de Conclusão:**
- [ ] `@fastify/compress` instalado e registrado
- [ ] Header `Content-Encoding: gzip` presente nas respostas JSON maiores
- [ ] Não interfere com upload de arquivos (multipart)

---

### AUD-P4-03 — Usar componente Image do Next.js

**Severidade:** Média
**Arquivos:** Páginas frontend que usam `<img>`

**Problema:**
Algumas páginas usam `<img>` nativo em vez do `<Image>` do Next.js, perdendo: lazy loading automático, otimização de formato (WebP), resize responsivo.

**Solução:**
```tsx
// ❌ Atual
<img src={member.photoUrl} alt={member.name} className="member-photo" />

// ✅ Next.js Image
import Image from "next/image";

<Image
  src={member.photoUrl}
  alt={member.name}
  width={48}
  height={48}
  className="member-photo"
  loading="lazy"
/>
```

**Observação:** Para imagens de URL externa (backend), adicionar o domínio em `next.config.js`:
```js
// next.config.js
module.exports = {
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost" },
      { protocol: "https", hostname: "seu-dominio.com" },
    ],
  },
};
```

**Critérios de Conclusão:**
- [ ] Todas as imagens de usuário/membro usam `<Image>`
- [ ] Domínio do backend configurado em `remotePatterns`
- [ ] Imagens com `width` e `height` definidos (evitar CLS)

---

### AUD-P4-04 — Adicionar loading skeletons nas páginas

**Severidade:** Média
**Arquivos:** `frontend/app/dashboard/page.tsx`, `frontend/app/usuarios/page.tsx`, `frontend/app/relatorios/page.tsx`

**Problema:**
Enquanto os dados carregam, o usuário vê a página em branco ou parcialmente renderizada, sem indicação de progresso.

**Solução:**
```tsx
// ✅ Skeleton simples com CSS
// globals.css
.skeleton {
  background: linear-gradient(90deg, var(--color-paper) 25%, var(--color-border) 50%, var(--color-paper) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: var(--radius-sm);
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

// ✅ Componente
function MemberCardSkeleton() {
  return (
    <div className="member-card" aria-hidden="true">
      <div className="skeleton" style={{ width: 48, height: 48, borderRadius: "50%" }} />
      <div className="skeleton" style={{ width: "60%", height: 16, marginTop: 8 }} />
      <div className="skeleton" style={{ width: "40%", height: 12, marginTop: 4 }} />
    </div>
  );
}

// ✅ Uso na página
if (loading) return <>{Array.from({ length: 5 }).map((_, i) => <MemberCardSkeleton key={i} />)}</>;
```

**Critérios de Conclusão:**
- [ ] Dashboard exibe skeleton nos cards de estatísticas
- [ ] Lista de membros exibe skeletons
- [ ] Lista de relatórios exibe skeletons
- [ ] Skeletons têm `aria-hidden="true"` (não anunciados por leitores de tela)
- [ ] Animação suave (shimmer)

---

### AUD-P4-05 — Implementar cache de dados com SWR

**Severidade:** Média
**Arquivos:** Frontend — páginas com fetching de dados

**Problema:**
Cada navegação entre páginas refaz todas as requisições, mesmo que os dados não tenham mudado. Isso aumenta o tempo de carregamento percebido e o tráfego de rede.

**Solução:**
```bash
cd frontend && npm install swr
```

```tsx
// ✅ frontend/lib/hooks/useMembers.ts
import useSWR from "swr";
import { getMembers } from "@/lib/api";

export function useMembers() {
  const { data, error, isLoading, mutate } = useSWR("/api/members", getMembers, {
    revalidateOnFocus: false,
    dedupingInterval: 30_000, // não refazer a mesma query por 30s
  });

  return { members: data ?? [], isLoading, error, refresh: mutate };
}

// ✅ Uso na página
function UsuariosPage() {
  const { members, isLoading } = useMembers();

  if (isLoading) return <MemberListSkeleton />;
  return <MemberList members={members} />;
}
```

**Critérios de Conclusão:**
- [ ] SWR instalado
- [ ] Hooks criados: `useMembers`, `useWarnings`, `useCourses`, `useDashboard`
- [ ] Dados em cache por 30 segundos
- [ ] Após mutação (criar/editar/deletar), cache invalidado com `mutate()`
- [ ] Sem requisições duplicadas em navegação rápida

---

### AUD-P4-06 — Lazy loading de páginas com dynamic import

**Severidade:** Baixa
**Arquivos:** `frontend/app/layout.tsx` ou páginas pesadas

**Problema:**
Páginas com muitos componentes são carregadas sincronamente, aumentando o bundle inicial.

**Solução:**
```tsx
// ✅ Importar modais pesados apenas quando necessários
import dynamic from "next/dynamic";

const ReportDetailModal = dynamic(
  () => import("@/components/ReportDetailModal"),
  { loading: () => <div>Carregando...</div>, ssr: false }
);
```

**Critérios de Conclusão:**
- [ ] Modais de detalhes carregados com `dynamic()`
- [ ] Bundle principal reduzido (verificar com `next build --analyze`)

---

## Dependências a Instalar

```bash
# Backend
cd backend && npm install @fastify/compress

# Frontend
cd frontend && npm install swr
```

---

## Métricas de Sucesso

| Métrica | Antes | Meta |
|---------|-------|------|
| Tempo de resposta lista advertências | ~500ms | < 100ms |
| Tamanho response JSON (gzip) | ~100% | ~30% |
| Requisições por navegação | N | Cache hit |
| LCP (Largest Contentful Paint) | > 2.5s | < 1.5s |

---

## Checklist de Conclusão da Sprint

- [x] AUD-P4-01 — Filtros no banco (advertências)
- [x] AUD-P4-02 — Compression middleware
- [x] AUD-P4-03 — Next.js Image
- [x] AUD-P4-04 — Loading skeletons
- [x] AUD-P4-05 — Cache com SWR
- [ ] AUD-P4-06 — Lazy loading de modais (modais inline, extração para P5)
- [ ] Medir tempos antes/depois

---

**Sprint Anterior:** [Sprint 3 — Acessibilidade](sprint-3-acessibilidade.md)
**Próxima Sprint:** [Sprint 5 — Refatoração](sprint-5-refatoracao.md)
