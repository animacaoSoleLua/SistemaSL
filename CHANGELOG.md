# Changelog - {{NOME_PROJETO}}

Todas as mudanças notáveis neste projeto serão documentadas aqui.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

---

## [Unreleased]

### Adicionado
- Estrutura base de monorepo com workspaces
- API Fastify com rota de saude e testes de integracao
- App web Next.js inicial com layout basico
- Configuracao inicial de banco e cache via Docker Compose
- Prisma configurado para PostgreSQL
- Seeds base de usuarios e helper de reset do banco para testes
- Relatorio automatico de cobertura de testes (Vitest)
- Validacao de escrita da pasta de uploads no startup
- Variavel UPLOADS_DIR para definir pasta de uploads em producao

### Modificado
- Stores da API agora usam Prisma/PostgreSQL em vez de memoria
- Testes de integracao atualizados para preparar dados no banco
- Script de testes da API agora gera cobertura automaticamente
- Teste de upload valida que o arquivo fica acessivel via /uploads

### Corrigido
- Nenhuma

### Removido
- Nenhuma

---

## [0.1.0] - {{DATA}}

### Adicionado
- Configuração inicial do projeto
- Estrutura de documentação (PRD + SPEC)
- Setup de desenvolvimento
- Configuração de testes

---

## Modelo de Entrada

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Adicionado
- Nova funcionalidade A
- Nova funcionalidade B

### Modificado
- Alteração na funcionalidade C

### Corrigido
- Bug X corrigido
- Bug Y corrigido

### Removido
- Funcionalidade depreciada D
```

---

## Convenções

### Tipos de Mudança

| Tipo | Descrição |
|------|-----------|
| **Adicionado** | Novas funcionalidades |
| **Modificado** | Mudanças em funcionalidades existentes |
| **Depreciado** | Funcionalidades que serão removidas |
| **Removido** | Funcionalidades removidas |
| **Corrigido** | Correções de bugs |
| **Segurança** | Correções de vulnerabilidades |

### Versionamento

- **MAJOR (X)**: Mudanças incompatíveis
- **MINOR (Y)**: Novas funcionalidades compatíveis
- **PATCH (Z)**: Correções de bugs compatíveis

---

[Unreleased]: https://github.com/{{usuario}}/{{repo}}/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/{{usuario}}/{{repo}}/releases/tag/v0.1.0
