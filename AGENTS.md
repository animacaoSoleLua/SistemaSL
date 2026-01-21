# Instrucao do Projeto - {{NOME_PROJETO}}

**Este arquivo e lido automaticamente pelo Codex CLI em toda nova sessao**

---

## MODO AUTONOMO ATIVADO

**Este projeto usa sistema de auto-progressao.**

O usuario e **nao-tecnico** e usa **comandos simples**. Voce deve:
1. Ler `docs/STATUS.md` SEMPRE ao iniciar
2. Identificar proxima tarefa automaticamente
3. Implementar, testar e documentar sem pedir detalhes
4. Atualizar `docs/STATUS.md` apos cada tarefa
5. Usar linguagem simples ao reportar

---

## COMANDOS DO USUARIO

Reconheca e responda a estes comandos:

### `continue` ou `proximo`
```
1. Read: docs/STATUS.md (identificar proxima tarefa)
2. Read: docs/prd/04-user-stories/[epic relevante]
3. Read: docs/spec/04-contratos-api/[dominio relevante]
4. Implementar codigo completo
5. Escrever testes (unit + integration)
6. Executar testes (Bash)
7. Atualizar documentacao (se necessario)
8. Edit: docs/STATUS.md (marcar tarefa completa, atualizar progresso)
9. Reportar resultado em linguagem simples
10. Mostrar proxima tarefa
```

### `status`
```
1. Read: docs/STATUS.md
2. Mostrar:
   - Progresso geral (%)
   - Fase atual
   - Ultimas 3 tarefas completas
   - Proximas 3 tarefas
   - Bloqueadores (se houver)
```

### `teste` ou `validar`
```
1. Executar todos os testes do projeto
2. Reportar resultados:
   - Unit tests: X/Y passed
   - Integration: X/Y passed
   - E2E: X/Y passed
3. Se falhar, tentar corrigir automaticamente
```

### `o que falta?`
```
1. Read: docs/STATUS.md
2. Listar proximas 5-10 tarefas
3. Mostrar fase e dependencias
```

### `revise`
```
1. Read: docs/STATUS.md (ultima tarefa)
2. Validar implementacao
3. Executar testes
4. Reportar se esta OK ou se precisa ajuste
```

### `explica`
```
1. Explicar ultima tarefa em linguagem SIMPLES
2. Sem jargao tecnico
3. Focar no "porque" e "beneficio"
```

### `pausa`
```
1. Salvar estado atual
2. Confirmar que pode fechar
3. Informar como retomar
```

### `resumo do dia`
```
1. Read: docs/STATUS.md (log de atividades)
2. Sumarizar tarefas do dia
3. Mostrar progresso acumulado
```

---

## PROTOCOLO OBRIGATORIO - Leia PRIMEIRO

### 1 Contextualizacao (SEMPRE ao iniciar sessao)

```
Read: docs/STATUS.md     (estado atual do projeto)
Read: README.md          (visao geral - se nao lembrar)
```

**Token Budget:** ~5K tokens

---

## Estrutura da Documentacao

```
docs/
├── INDEX.md                    <- Navegacao completa
├── prd/                        <- Requisitos de produto
│   ├── README.md              <- Indice do PRD
│   ├── 01-visao-objetivos.md
│   ├── 04-user-stories/       <- Epics (ler 1 por vez)
│   └── ...
└── spec/                       <- Especificacoes tecnicas
    ├── README.md              <- Indice da SPEC
    ├── 03-modelo-dados.md
    ├── 04-contratos-api/      <- Dominios (ler 1 por vez)
    └── ...
```

---

## Regras Criticas

1. **NUNCA** ler multiplos arquivos grandes simultaneamente
2. **SEMPRE** usar `rg`/glob antes de Read
3. **SEMPRE** consultar indices antes de ler conteudo
4. **LIMITE:** <50K tokens por interacao

---

## Estrategia de Leitura

**Para implementar feature:**
```
1. Read: docs/prd/04-user-stories/epic-XX.md  (requisitos)
2. Read: docs/spec/04-contratos-api/XX.md     (API)
3. rg: "termo especifico" em docs/spec/       (localizar)
4. Read: arquivo especifico (offset + limit)  (detalhes)
```

**Para debugging:**
```
1. Identificar dominio
2. Read: docs/spec/04-contratos-api/[dominio].md
3. Read: docs/spec/06-maquina-estados.md (se precisar de estados)
```

---

## Orcamento de Tokens por Tarefa

| Tarefa | Tokens | Arquivos |
|--------|--------|----------|
| Visao geral | 15K | README + INDEX |
| User story | 8K | 1 epic |
| API endpoint | 10K | 1 dominio |
| Feature completa | 30K | US + API + Schema |

---

## Links Rapidos

- **Inicio Rapido:** `AI-START.md` (~2K tokens)
- **Guia Completo:** `README.md` secao "Guia para Agentes de IA"
- **Protocolo Detalhado:** `.ai-instructions.md`
- **Manutencao de Docs:** `docs/MANUTENCAO.md`

---

## Projeto: {{NOME_PROJETO}}

**Descricao:** {{DESCRICAO_PROJETO}}

**Funcionalidades Principais:**
- {{FUNCIONALIDADE_1}}
- {{FUNCIONALIDADE_2}}
- {{FUNCIONALIDADE_3}}

**Stack:**
- Backend: {{STACK_BACKEND}}
- Database: {{STACK_DATABASE}}
- Frontend: {{STACK_FRONTEND}}

**Status:** Documentacao -> Implementacao

---

## Linguagem Para o Usuario

**O usuario NAO e tecnico. Use linguagem SIMPLES:**

Evite:
- "Implementei o endpoint REST com validacao Zod"
- "Configurei o Prisma ORM com migrations"
- "Adicionei testes unitarios com Jest e 95% de coverage"

Use:
- "Criei a funcionalidade de criar [recurso]"
- "Configurei o banco de dados para guardar informacoes"
- "Adicionei verificacoes automaticas para garantir que tudo funciona"

**Formato de Resposta:**

```
Tarefa Completa: [Nome da tarefa em linguagem simples]

O que fiz:
- [Descricao simples, sem jargao]
- [Beneficio para o usuario]

Status:
- Testes: Todos passaram
- Documentacao: Atualizada
- Progresso: X% -> Y%

Proxima tarefa: [O que vou fazer agora]
```

---

## Ciclo Automatico

Para comando `continue`:

```
1. Read docs/STATUS.md
2. Identificar FASE-X-TASK-Y
3. Read documentacao relevante (PRD + SPEC)
4. Implementar codigo
5. Escrever testes
6. Bash executar testes
7. Edit docs/STATUS.md (atualizar progresso)
8. Edit CHANGELOG.md (se necessario)
9. Reportar em linguagem simples
10. Identificar proxima tarefa
```

**Token Budget por Ciclo:** ~30-40K tokens

---

## Checklist Antes de Comecar Tarefa

- [ ] Li docs/STATUS.md para identificar tarefa atual?
- [ ] Li documentacao relevante (PRD + SPEC)?
- [ ] Tenho orcamento <50K tokens para esta tarefa?
- [ ] Vou reportar em linguagem simples?
- [ ] Vou atualizar STATUS.md ao final?

---

**Ultima Atualizacao:** {{DATA}}
**Versao:** 1.0.0
