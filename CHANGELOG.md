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
- Tela de novo relatorio refeita com seções completas, campos condicionais e upload por categoria
- Formulário de novo relatório agora salva na API real e usa seletor visual de estrelas para notas 0-5
- API e banco de relatórios atualizados com os novos campos do formulário (locomoção, hora extra, notas e eletrônicos)
- Aba de relatórios agora abre modal de visualização completa ao clicar em "Ver" (com dados completos, mídias e feedbacks)
- API de relatórios agora retorna `author_name` na listagem e no detalhe
- Aba de relatórios agora tem botão para excluir relatório com confirmação
- API de detalhe de relatório agora retorna `created_at` e `member_name` em cada feedback individual
- Relatórios agora podem ser editados na mesma tela de criação, com preenchimento automático dos dados salvos
- Dashboard agora mostra números reais nos cards de estatísticas e exibe uma lista simplificada dos relatórios recentes
- Endpoint `/dashboard/qualidade` agora retorna também as médias de qualidade e dificuldade do evento
- Confirmação de exclusão de relatório agora usa modal visual em vez de `window.confirm`, com botão "Excluir relatório" e mensagem mais clara
- Upload de fotos no novo relatório agora funciona de forma incremental (adiciona sem substituir), com listagem item a item e remoção individual antes de salvar
- Listagem de relatórios agora mostra prévia visual das fotos anexadas direto no card (sem precisar abrir o detalhe)
- Formulário de novo relatório agora permite visualizar cada imagem selecionada por um botão "Visualizar" antes de salvar
- Listagem de relatórios não exibe mais miniaturas de fotos nos cards

### Corrigido
- Remoção de foto de perfil agora persiste após recarregar a página (novo endpoint `DELETE /membros/:id/foto` + uso no frontend)
- Formulário de novo relatório agora envia de fato as mídias anexadas para `/relatorios/:id/media`, salvando em `uploads`
- Modal de visualização de relatório com rolagem interna para exibir todos os campos quando houver muito conteúdo
- Modal de relatório agora exibe o nome do autor no lugar do ID
- Modal de relatório agora oculta campos condicionais não respondidos (ex.: Uber vs outro carro)
- Feedbacks individuais no modal agora mostram o nome da pessoa em vez do ID
- Modal de relatório agora mostra rótulos amigáveis de locomoção (`Uber/99`, `Outro`, `Carro da Empresa`)
- Cards do formulário de relatório mantêm `display: block` com espaçamento vertical consistente entre blocos, evitando campos colados (ex.: hora extra e exclusividade)
- Barra de pesquisa dos relatórios agora encontra por contratante, título/cronograma e autor do relatório
- API de listagem de relatórios agora também busca pelo nome do autor no parâmetro `search`
- Card "Avaliação Média da Equipe" da dashboard agora calcula a média com base na nota geral da equipe (`team_general_score`)
- Dashboard agora exibe dois novos cards com a média de qualidade do evento e a média de dificuldade do evento
- Frontend em Docker dev agora reinstala dependências ao iniciar, evitando erro de módulo não encontrado após novas bibliotecas
- Fluxo de hora extra dos relatórios agora mantém e exibe os dados corretamente no backend e no frontend (incluindo fallback quando só o detalhe foi enviado)

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
