# Instruções do Projeto - {{NOME_PROJETO}}

**Este arquivo é lido automaticamente pelo Gemini CLI em toda nova sessão**

---

## 🤖 MODO AUTÔNOMO ATIVADO

**Este projeto usa sistema de auto-progressão.**

O usuário é **não-técnico** e usa **comandos simples**. Como Gemini CLI, você deve:
1. Ler `docs/STATUS.md` SEMPRE ao iniciar
2. Identificar próxima tarefa automaticamente
3. Implementar, testar e documentar sem pedir detalhes
4. Atualizar STATUS.md após cada tarefa
5. Usar linguagem simples ao reportar

---

## 🎯 COMANDOS DO USUÁRIO

Reconheça e responda a estes comandos:

### `continue` ou `próximo`
```
1. Read: docs/STATUS.md (identificar próxima tarefa)
2. Read: docs/prd/04-user-stories/[epic relevante]
3. Read: docs/spec/04-contratos-api/[domínio relevante]
4. Implementar código completo
5. Escrever testes (unit + integration)
6. Executar testes (Bash)
7. Atualizar documentação (se necessário)
8. Edit: docs/STATUS.md (marcar tarefa completa, atualizar progresso)
9. Reportar resultado em linguagem simples
10. Mostrar próxima tarefa
```

### `status`
```
1. Read: docs/STATUS.md
2. Mostrar:
   - Progresso geral (%)
   - Fase atual
   - Últimas 3 tarefas completas
   - Próximas 3 tarefas
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
2. Listar próximas 5-10 tarefas
3. Mostrar fase e dependências
```

### `revise`
```
1. Read: docs/STATUS.md (última tarefa)
2. Validar implementação
3. Executar testes
4. Reportar se está OK ou se precisa ajuste
```

### `explica`
```
1. Explicar última tarefa em linguagem SIMPLES
2. Sem jargão técnico
3. Focar no "porquê" e "benefício"
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

## ⚡ PROTOCOLO OBRIGATÓRIO - Leia PRIMEIRO

### 1️⃣ Contextualização (SEMPRE ao iniciar sessão)

```
Read: docs/STATUS.md     (estado atual do projeto)
Read: README.md          (visão geral - se não lembrar)
```

**Token Budget:** ~5K tokens

---

## 📚 Estrutura da Documentação

```
docs/
├── INDEX.md                    ← Navegação completa
├── prd/                        ← Requisitos de produto
│   ├── README.md              ← Índice do PRD
│   ├── 01-visao-objetivos.md
│   ├── 04-user-stories/       ← Epics (ler 1 por vez)
│   └── ...
└── spec/                       ← Especificações técnicas
    ├── README.md              ← Índice da SPEC
    ├── 03-modelo-dados.md
    ├── 04-contratos-api/      ← Domínios (ler 1 por vez)
    └── ...
```

---

## ❌ REGRAS CRÍTICAS

1. **NUNCA** ler múltiplos arquivos grandes simultaneamente
2. **SEMPRE** usar Grep/Glob antes de Read
3. **SEMPRE** consultar índices antes de ler conteúdo
4. **LIMITE:** <50K tokens por interação

---

## ✅ Estratégia de Leitura

**Para implementar feature:**
```
1. Read: docs/prd/04-user-stories/epic-XX.md  (requisitos)
2. Read: docs/spec/04-contratos-api/XX.md     (API)
3. Grep: "termo específico" em docs/spec/     (localizar)
4. Read: arquivo específico (offset + limit)   (detalhes)
```

**Para debugging:**
```
1. Identificar domínio
2. Read: docs/spec/04-contratos-api/[dominio].md
3. Read: docs/spec/06-maquina-estados.md (se precisar de estados)
```

---

## 📊 Orçamento de Tokens por Tarefa

| Tarefa | Tokens | Arquivos |
|--------|--------|----------|
| Visão geral | 15K | README + INDEX |
| User story | 8K | 1 epic |
| API endpoint | 10K | 1 domínio |
| Feature completa | 30K | US + API + Schema |

---

## 🔗 Links Rápidos

- **Início Rápido:** `AI-START.md` (~2K tokens)
- **Guia Completo:** `README.md` seção "🤖 Guia para Agentes de IA"
- **Protocolo Detalhado:** `.ai-instructions.md`
- **Manutenção de Docs:** `docs/MANUTENÇÃO.md`

---

## 🎯 Projeto: {{NOME_PROJETO}}

**Descrição:** {{DESCRICAO_PROJETO}}

**Funcionalidades Principais:**
- {{FUNCIONALIDADE_1}}
- {{FUNCIONALIDADE_2}}
- {{FUNCIONALIDADE_3}}

**Stack:**
- Backend: {{STACK_BACKEND}}
- Database: {{STACK_DATABASE}}
- Frontend: {{STACK_FRONTEND}}

**Status:** 📋 Documentação → 🚀 Implementação

---

## 💬 LINGUAGEM PARA O USUÁRIO

**O usuário NÃO é técnico. Use linguagem SIMPLES:**

❌ Evite:
- "Implementei o endpoint REST com validação Zod"
- "Configurei o Prisma ORM com migrations"
- "Adicionei testes unitários com Jest e 95% de coverage"

✅ Use:
- "Criei a funcionalidade de criar [recurso]"
- "Configurei o banco de dados para guardar informações"
- "Adicionei verificações automáticas para garantir que tudo funciona"

**Formato de Resposta:**

```
✅ Tarefa Completa: [Nome da tarefa em linguagem simples]

O que fiz:
- [Descrição simples, sem jargão]
- [Benefício para o usuário]

Status:
- Testes: ✅ Todos passaram
- Documentação: ✅ Atualizada
- Progresso: X% → Y%

Próxima tarefa: [O que vou fazer agora]
```

## 🔄 CICLO AUTOMÁTICO

Para comando `continue`:

```
1. READ docs/STATUS.md
2. Identificar FASE-X-TASK-Y
3. READ documentação relevante (PRD + SPEC)
4. IMPLEMENTAR código
5. ESCREVER testes
6. BASH executar testes
7. EDIT docs/STATUS.md (atualizar progresso)
8. EDIT CHANGELOG.md (se necessário)
9. REPORTAR em linguagem simples
10. IDENTIFICAR próxima tarefa
```

**Token Budget por Ciclo:** ~30-40K tokens

## 📋 Checklist Antes de Começar Tarefa

- [ ] Li docs/STATUS.md para identificar tarefa atual?
- [ ] Li documentação relevante (PRD + SPEC)?
- [ ] Tenho orçamento <50K tokens para esta tarefa?
- [ ] Vou reportar em linguagem simples?
- [ ] Vou atualizar STATUS.md ao final?

---

**Última Atualização:** {{DATA}}
**Versão:** 1.0.0
