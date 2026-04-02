<p align="center">
  <img src="frontend/assets/logo.png" alt="Sol e Lua" width="200" />
</p>

# Sistema Sol e Lua

Sistema interno para equipes de recreação e animação de eventos. Centraliza o gerenciamento de membros, relatórios de eventos, cursos, advertências e feedbacks de clientes — substituindo papéis e planilhas por uma plataforma web unificada.

---

## Funcionalidades

- **Relatórios de eventos** — criação com fotos/vídeos, notas de equipe e avaliações
- **Gestão de membros** — perfis, roles (admin, animador, recreador), suspensões
- **Cursos** — inscrição, controle de vagas e integração com Google Calendar
- **Advertências** — registro com histórico e vínculo a suspensões
- **Feedbacks de clientes** — registros positivos/negativos com áudio ou texto
- **Autenticação** — login com email/senha e recuperação de senha via e-mail

---

## Tecnologias

### Backend
| Tecnologia | Uso |
|------------|-----|
| [Fastify](https://fastify.dev/) | Framework HTTP |
| [Prisma](https://www.prisma.io/) | ORM |
| [PostgreSQL](https://www.postgresql.org/) | Banco de dados |
| [Zod](https://zod.dev/) | Validação de schemas |
| [Vitest](https://vitest.dev/) | Testes |
| [TypeScript](https://www.typescriptlang.org/) | Linguagem |

### Frontend
| Tecnologia | Uso |
|------------|-----|
| [Next.js 14](https://nextjs.org/) | Framework React (App Router) |
| [Tailwind CSS](https://tailwindcss.com/) | Estilização |
| [React Hook Form](https://react-hook-form.com/) | Formulários |
| [SWR](https://swr.vercel.app/) | Fetching e cache |
| [TypeScript](https://www.typescriptlang.org/) | Linguagem |

---

## Como Rodar

### Pré-requisitos

- Node.js 20+
- PostgreSQL 15+

### 1. Clone e instale dependências

```bash
git clone <url-do-repo>
cd SistemaSL

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2. Configure as variáveis de ambiente

```bash
cd backend
cp .env.example .env
```

Edite o `.env` com suas credenciais:


### 3. Execute as migrations e suba o banco

```bash
cd backend
npx prisma migrate deploy
```

### 4. Rode em desenvolvimento

```bash
# Terminal 1 — backend (porta 3001)
cd backend && npm run dev

# Terminal 2 — frontend (porta 3000)
cd frontend && npm run dev
```

Acesse: [http://localhost:3000](http://localhost:3000)

---
