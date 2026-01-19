# Template de Projeto com Documentação Estruturada

> Framework completo para criar projetos com documentação profissional e desenvolvimento guiado por IA

**Versão:** 1.0.0

---

## O que é este Template?

Este template fornece uma estrutura completa para iniciar novos projetos de software com:

1. **Briefing Guiado** - Processo interativo para capturar requisitos
2. **PRD Estruturado** - Documentos de requisitos organizados
3. **SPEC Técnica** - Especificações técnicas detalhadas
4. **Integração com IA** - Configuração para Claude Code e outras IAs
5. **Modo Autônomo** - Sistema de auto-progressão para desenvolvimento

---

## Como Usar

### 1. Copie o Template

```bash
cp -r template/ /caminho/do/seu-novo-projeto/
cd /caminho/do/seu-novo-projeto/
```

### 2. Inicie o Briefing

Abra o Claude Code e digite:

```
/briefing
```

Ou manualmente:

```
Leia briefing/GUIA-BRIEFING.md e me guie pelo processo
```

### 3. O Sistema Vai Guiar Você

O briefing consiste em 6 etapas:

| Etapa | Descrição | Duração |
|-------|-----------|---------|
| 1. Visão | Nome, problema, solução | 5-10 min |
| 2. Personas | Quem vai usar, dores, necessidades | 10-15 min |
| 3. Escopo | O que faz, o que não faz | 5-10 min |
| 4. Funcionalidades | Listagem de features | 10-20 min |
| 5. Técnico | Stack, integrações | 5-10 min |
| 6. Revisão | Validação final | 5 min |

**Total:** 40-70 minutos

### 4. Documentação é Gerada Automaticamente

Após o briefing, a IA gera:

- `docs/prd/` - Documentos de requisitos
- `docs/spec/` - Especificações técnicas
- `docs/STATUS.md` - Tracker de progresso

### 5. Comece a Implementar

```
continue
```

A IA segue o STATUS.md e implementa tarefa por tarefa.

---

## Estrutura do Template

```
template/
├── README.md                    ← Este arquivo
├── INÍCIO-RÁPIDO.md            ← Guia para usuários não-técnicos
│
├── briefing/                    ← Sistema de briefing guiado
│   ├── GUIA-BRIEFING.md        ← Instruções do processo
│   ├── 01-VISAO.md             ← Template de perguntas de visão
│   ├── 02-PERSONAS.md          ← Template de perguntas de personas
│   ├── 03-ESCOPO.md            ← Template de perguntas de escopo
│   ├── 04-FUNCIONALIDADES.md   ← Template de perguntas de features
│   ├── 05-TECNICO.md           ← Template de perguntas técnicas
│   └── 06-REVISAO.md           ← Checklist de revisão
│
├── docs/                        ← Documentação gerada
│   ├── INDEX.md                ← Índice navegável (template)
│   ├── STATUS.md               ← Tracker de progresso (template)
│   ├── MANUTENÇÃO.md           ← Guia de manutenção
│   │
│   ├── prd/                    ← Product Requirements Document
│   │   ├── README.md           ← Índice do PRD
│   │   ├── 01-visao-objetivos.md
│   │   ├── 02-contexto-personas.md
│   │   ├── 03-escopo.md
│   │   ├── 04-user-stories/
│   │   │   ├── README.md
│   │   │   └── epic-XX-template.md
│   │   ├── 05-rnf.md
│   │   ├── 06-priorizacao.md
│   │   ├── 07-dependencias.md
│   │   ├── 08-compliance.md
│   │   ├── 09-metricas.md
│   │   ├── 10-riscos.md
│   │   └── 11-glossario.md
│   │
│   └── spec/                   ← Especificação Técnica
│       ├── README.md           ← Índice da SPEC
│       ├── 01-visao-geral.md
│       ├── 02-arquitetura.md
│       ├── 03-modelo-dados.md
│       ├── 04-contratos-api/
│       │   ├── README.md
│       │   └── dominio-template.md
│       ├── 05-diagramas-sequencia.md
│       ├── 06-maquina-estados.md
│       ├── 07-tratamento-erros.md
│       ├── 08-estrategia-testes.md
│       ├── 09-deployment.md
│       ├── 10-observabilidade.md
│       ├── 11-seguranca.md
│       ├── 12-performance.md
│       └── 13-rastreabilidade.md
│
├── .claude/                    ← Configuração Claude Code
│   └── CLAUDE.md              ← Instruções automáticas
│
├── .ai-instructions.md         ← Protocolo para IAs
├── AI-START.md                 ← Quick start para IAs
├── CHANGELOG.md                ← Histórico de mudanças
└── .gitignore                  ← Arquivos ignorados pelo Git
```

---

## Comandos Disponíveis

Após configurar, você pode usar:

| Comando | Descrição |
|---------|-----------|
| `continue` | Continua implementando próxima tarefa |
| `status` | Mostra progresso atual |
| `teste` | Executa testes |
| `explica` | Explica última tarefa em linguagem simples |
| `pausa` | Salva estado para continuar depois |
| `o que falta?` | Lista próximas tarefas |

---

## Filosofia do Template

### 1. Documentação Primeiro

Antes de escrever código, documentamos:
- O que estamos construindo (PRD)
- Como vamos construir (SPEC)
- Por que estamos construindo (Visão)

### 2. Estrutura Modular

Documentos são divididos em arquivos pequenos:
- Fácil de navegar
- Não estoura contexto de IAs
- Manutenção simplificada

### 3. Rastreabilidade

Cada funcionalidade é rastreável:
- User Story → Requisito → API → Teste

### 4. Modo Autônomo

A IA pode trabalhar sem supervisão constante:
- Lê STATUS.md para saber o que fazer
- Implementa, testa, documenta
- Atualiza progresso automaticamente

---

## Customização

### Adicionar Novas Seções ao PRD

1. Crie arquivo em `docs/prd/XX-nome.md`
2. Atualize `docs/prd/README.md`
3. Atualize `docs/INDEX.md`

### Adicionar Novos Domínios de API

1. Crie arquivo em `docs/spec/04-contratos-api/nome.md`
2. Atualize `docs/spec/04-contratos-api/README.md`

### Alterar Processo de Briefing

Edite os arquivos em `briefing/` para adicionar/remover perguntas.

---

## Compatibilidade

Este template é compatível com:

- **Claude Code** (configuração automática via .claude/)
- **GPT-4** (use AI-START.md como prompt inicial)
- **Gemini** (use AI-START.md como prompt inicial)
- **Outras IAs** (siga .ai-instructions.md)

---

## Contribuindo

Para melhorar este template:

1. Identifique área de melhoria
2. Documente a mudança
3. Teste com projeto real
4. Atualize README e guias

---

## Licença

[Definir licença]

---

**Criado com base no projeto:** Agente de Prospecção Multicanal
**Versão:** 1.0.0
**Data:** 2026-01-19
