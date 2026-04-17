# 🔧 Guia de Manutenção da Documentação

**Versão:** 1.0.0
**Última Atualização:** {{DATA}}

---

## 📋 Índice

1. [Visão Geral](#1-visão-geral)
2. [Estrutura de Arquivos](#2-estrutura-de-arquivos)
3. [Quando Atualizar](#3-quando-atualizar)
4. [Como Atualizar](#4-como-atualizar)
5. [Padrões e Convenções](#5-padrões-e-convenções)
6. [Checklist de Manutenção](#6-checklist-de-manutenção)

---

## 1. Visão Geral

### Princípios

1. **Documentação Modular**: Arquivos pequenos e focados
2. **Single Source of Truth**: Cada informação em um único lugar
3. **Sempre Atualizada**: Documentação evolui com o código
4. **Navegável**: Índices e links para fácil acesso

### Responsabilidades

| Quem | O Quê |
|------|-------|
| **IA** | Atualizar STATUS.md após cada tarefa |
| **IA** | Manter CHANGELOG.md atualizado |
| **Humano** | Revisar PRD quando requisitos mudam |
| **Humano** | Aprovar mudanças significativas |

---

## 2. Estrutura de Arquivos

### Hierarquia

```
docs/
├── INDEX.md              # Navegação central
├── STATUS.md             # Estado atual (atualizar sempre!)
├── MANUTENÇÃO.md         # Este guia
├── prd/                  # Requisitos
│   ├── README.md         # Índice do PRD
│   ├── 01-11 seções      # Documentos do PRD
│   └── 04-user-stories/  # Epics separados
└── spec/                 # Especificações
    ├── README.md         # Índice da SPEC
    ├── 01-13 seções      # Documentos da SPEC
    └── 04-contratos-api/ # APIs separadas
```

### Convenções de Nomes

| Tipo | Formato | Exemplo |
|------|---------|---------|
| Seções PRD | `NN-nome.md` | `01-visao-objetivos.md` |
| Seções SPEC | `NN-nome.md` | `03-modelo-dados.md` |
| Epics | `epic-NN-nome.md` | `epic-01-autenticacao.md` |
| APIs | `dominio.md` | `usuarios.md` |

---

## 3. Quando Atualizar

### STATUS.md - Atualizar SEMPRE

| Evento | Ação |
|--------|------|
| Iniciar tarefa | Marcar como "Em progresso" |
| Completar tarefa | Marcar como "Completo" |
| Encontrar bloqueador | Adicionar à seção Bloqueadores |
| Fim de sessão | Atualizar log de atividades |

### PRD - Atualizar Quando

- [ ] Novos requisitos identificados
- [ ] Mudança de escopo
- [ ] Nova persona descoberta
- [ ] Prioridades alteradas

### SPEC - Atualizar Quando

- [ ] Nova API implementada
- [ ] Schema de dados alterado
- [ ] Novo fluxo adicionado
- [ ] Padrão técnico mudou

---

## 4. Como Atualizar

### STATUS.md

```markdown
## Antes
| FASE-2-TASK-003 | Implementar X | ⏳ Pendente |

## Depois
| FASE-2-TASK-003 | Implementar X | ✅ Completo |
```

**Também atualizar:**
- Progresso geral (%)
- Última tarefa
- Log de atividades

### User Stories

**Ao adicionar nova US:**
1. Adicionar no epic correspondente
2. Atualizar contador no `prd/README.md`
3. Atualizar `spec/13-rastreabilidade.md`

### APIs

**Ao adicionar novo endpoint:**
1. Adicionar no arquivo do domínio
2. Atualizar índice em `spec/04-contratos-api/README.md`
3. Atualizar `spec/13-rastreabilidade.md`

---

## 5. Padrões e Convenções

### Markdown

```markdown
# Título Principal (H1) - 1 por arquivo

## Seção (H2)

### Subseção (H3)

**Negrito** para ênfase
`código` para termos técnicos
[Link](caminho) para navegação
```

### Tabelas

```markdown
| Coluna 1 | Coluna 2 | Coluna 3 |
|----------|----------|----------|
| Valor 1  | Valor 2  | Valor 3  |
```

### Status Icons

| Icon | Significado |
|------|-------------|
| ✅ | Completo |
| 🔄 | Em progresso |
| ⏳ | Pendente |
| 🚧 | Bloqueado |
| ❌ | Cancelado |
| ⚠️ | Atenção |

### Placeholders

Use `{{PLACEHOLDER}}` para valores a serem preenchidos:

```markdown
**Projeto:** {{NOME_PROJETO}}
**Data:** {{DATA}}
**Versão:** {{VERSAO}}
```

---

## 6. Checklist de Manutenção

### Após Cada Tarefa

- [ ] STATUS.md atualizado
- [ ] Tarefa marcada como completa
- [ ] Progresso recalculado
- [ ] Log de atividades atualizado

### Após Cada Sprint/Fase

- [ ] Revisar todas as seções do PRD
- [ ] Verificar consistência da SPEC
- [ ] Atualizar métricas
- [ ] Limpar bloqueadores resolvidos

### Mensalmente

- [ ] Revisar e arquivar logs antigos
- [ ] Verificar links quebrados
- [ ] Atualizar versões de dependências
- [ ] Backup da documentação

---

## 📊 Métricas de Documentação

| Métrica | Meta | Atual |
|---------|------|-------|
| Cobertura de US | 100% | {{X}}% |
| APIs documentadas | 100% | {{Y}}% |
| Links válidos | 100% | {{Z}}% |
| Última atualização | <7 dias | {{DATA}} |

---

## 🔗 Templates

### Nova User Story

```markdown
## US-XXX: {{Título}}

**Como** {{persona}}
**Quero** {{ação}}
**Para que** {{benefício}}

**Prioridade:** {{Must/Should/Could/Won't}}
**Estimativa:** {{tempo}}

**Critérios de Aceitação:**
1. Dado que... Quando... Então...
```

### Novo Endpoint

```markdown
## {{MÉTODO}} /api/v1/{{recurso}}

**Descrição:** {{descrição}}
**Autenticação:** {{tipo}}

**Request:**
- Headers: {{headers}}
- Body: {{schema}}

**Response:**
- 200: {{sucesso}}
- 4XX: {{erros cliente}}
- 5XX: {{erros servidor}}
```

---

## ❓ FAQ

**P: Posso deletar documentação antiga?**
R: Não delete, mova para uma pasta `archive/` com data.

**P: Como lidar com conflitos de informação?**
R: STATUS.md é a fonte da verdade para estado atual. PRD para requisitos.

**P: Quem aprova mudanças no PRD?**
R: Mudanças significativas precisam de aprovação humana.

---

**Mantenha a documentação viva e útil!**
