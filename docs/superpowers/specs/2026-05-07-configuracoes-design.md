# Design: Página de Configurações com Sub-abas

**Data:** 2026-05-07  
**Status:** Aprovado

## Contexto

A página `/perfil` atual exibe todos os dados do usuário em scroll vertical único: formulário de dados pessoais, lista de cursos e lista de advertências. O item de navegação se chama "Perfil".

O objetivo é reorganizar essa página em uma estrutura de Configurações com sub-abas, tornando a navegação mais clara e separando responsabilidades por seção.

## Mudanças na Navegação Principal

- Item "Perfil" no `SidebarNav.tsx` renomeado para "Configurações"
- `href` alterado de `/perfil` para `/configuracoes`
- Função `isActive` atualizada para cobrir `/configuracoes/*`
- A página antiga `/perfil` adiciona redirect para `/configuracoes` (para não quebrar links antigos)

## Estrutura de Rotas (Next.js App Router)

```
app/configuracoes/
  layout.tsx            ← barra de abas horizontal compartilhada
  page.tsx              ← redirect para /configuracoes/perfil
  perfil/page.tsx       ← dados pessoais + foto
  seguranca/page.tsx    ← email + senha
  cursos/page.tsx       ← cursos inscritos
  advertencias/page.tsx ← advertências recebidas
```

## Layout Compartilhado (`layout.tsx`)

- Título "Configurações" no topo
- Barra de abas horizontal com 4 abas: Perfil | Segurança | Cursos | Advertências
- Cada aba é um `<Link>` com classe `active` quando o pathname corresponde
- Abaixo das abas: `{children}` com o conteúdo da sub-rota ativa
- Responsivo: em mobile, abas rolam horizontalmente com `overflow-x: auto`
- Auth guard: verifica usuário logado e role permitida (`recreador`, `animador`, `admin`); se não autorizado, redireciona para `/login`
- Dados do membro: cada sub-página faz seu próprio fetch (sem estado compartilhado no layout)

## Aba Perfil (`/configuracoes/perfil`)

Conteúdo: exatamente o formulário atual da página `/perfil`, exceto o campo e-mail (que migra para Segurança).

Campos: foto de perfil, nome, sobrenome, CPF, data de nascimento, região administrativa, telefone, chave Pix, contato de emergência (quem é + telefone).

Comportamento: idêntico ao atual — detecta alterações, botão "Salvar perfil" desabilitado sem mudanças, feedback de sucesso/erro inline.

## Aba Segurança (`/configuracoes/seguranca`)

Dois blocos independentes na mesma página:

**Bloco 1 — Email de acesso**
- Mostra o email atual (leitura)
- Campo para novo email
- Botão "Salvar email" — chama `updateMember` (PATCH existente) com o novo email
- Feedback inline de sucesso/erro

**Bloco 2 — Senha**
- Campo: senha atual
- Campo: nova senha
- Campo: confirmar nova senha
- Validação no frontend: nova senha === confirmar nova senha antes de enviar
- Botão "Salvar senha" — chama novo endpoint `PATCH /api/v1/membros/:id/senha`
- Feedback inline de sucesso/erro (inclui mensagem clara se senha atual estiver errada)

## Aba Cursos (`/configuracoes/cursos`)

Lista de cursos do usuário, extraída da seção "Meus cursos" da página atual.

Exibe: data, título, status (Presente / Faltou / Inscrito). Estado vazio: "Nenhum curso inscrito."

## Aba Advertências (`/configuracoes/advertencias`)

Lista de advertências do usuário, extraída da seção "Minhas advertências" da página atual.

Exibe: data, motivo, dado por (nome do emissor). Estado vazio: "Nenhuma advertência registrada."

Mantém alerta de suspensão ativa (se houver) no topo da aba.

## Backend — Novo Endpoint de Troca de Senha

**Rota:** `PATCH /api/v1/membros/:id/senha`

**Auth:** token obrigatório; apenas o próprio usuário pode alterar sua senha (admin não pode alterar senha de outro via esse endpoint).

**Body:**
```json
{
  "current_password": "string",
  "new_password": "string"
}
```

**Validação:**
1. `current_password` e `new_password` obrigatórios
2. Verifica `current_password` contra o hash armazenado via `verifyPassword`
3. Se inválida: retorna 400 `{ error: "invalid_password", message: "Senha atual incorreta" }`
4. `new_password` passa pela validação de força existente (`validatePasswordStrength`)
5. Se válida: atualiza o hash no banco e retorna 200

**Frontend — nova função na `lib/api.ts`:**
```ts
changePassword(id: string, current_password: string, new_password: string)
```

## Dados Compartilhados

Cada sub-página faz seu próprio fetch via `getMember(user.id)` para evitar estado global complexo. Os dados de cursos e advertências já vêm no endpoint existente `/membros/:id`.

## CSS

- Estilos das abas em `app/configuracoes/layout.css` (novo arquivo)
- Estilos específicos de cada sub-página em seus próprios arquivos CSS
- Os estilos de `perfil/page.css` são reaproveitados na sub-página de perfil

## O que NÃO muda

- API endpoints existentes (exceto adição do novo endpoint de senha)
- Estrutura dos dados retornados pelo backend
- Lógica de autenticação/roles
- Visual geral do sistema
