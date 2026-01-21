# 1. Visao Geral Tecnica

**Versao:** 1.0.0
**Ultima Atualizacao:** 2026-01-20

← [Voltar para SPEC](README.md)

---

## 1.1 Objetivo do Sistema

Centralizar relatorios de eventos, cursos e advertencias em uma aplicacao web com controle de acesso por papel, permitindo consultas rapidas e historico confiavel.

---

## 1.2 Escopo do MVP

### Incluido no MVP

| Funcionalidade | Descricao | Complexidade |
|----------------|-----------|--------------|
| Relatorios | Criar relatorios com midia | Media |
| Membros | Cadastro, login e perfis | Media |
| Cursos | Criar cursos e controlar vagas | Media |
| Advertencias | Registrar e suspender por regra | Media |

### Excluido do MVP

- Sistema de pagamento
- Chat nativo
- App mobile

---

## 1.3 Premissas Tecnicas

| Premissa | Impacto se Falsa |
|----------|------------------|
| Internet disponivel no uso | Sistema nao funciona offline |
| Uso de VPS com Docker | Ajustar arquitetura caso nao seja possivel |
| Email transacional via Resend | Trocar provedor se indisponivel |

---

## 1.4 Restricoes Tecnicas

| Restricao | Motivo | Alternativa |
|-----------|--------|-------------|
| Orcamento ate R$ 300/mes | Limite de custo | Otimizar recursos |
| Armazenamento de midia externo | Evitar sobrecarga da VPS | S3 compativel |

---

## 1.5 Decisoes Arquiteturais (ADRs)

### ADR-001: Aplicacao web com Next.js

- **Status:** Aceito
- **Contexto:** Interface simples e responsiva
- **Decisao:** Usar Next.js para frontend e server-side rendering quando necessario
- **Consequencias:** Menos tempo para entregar UI consistente

### ADR-002: API Node.js com Fastify

- **Status:** Aceito
- **Contexto:** Precisamos de API rapida e simples
- **Decisao:** Usar Fastify com Prisma
- **Consequencias:** Curva de aprendizado baixa e boa performance

---

## 1.6 Stack Tecnologico Resumido

| Camada | Tecnologia | Versao |
|--------|------------|--------|
| Backend | Node.js + Fastify | 18+ / 4+ |
| Frontend | Next.js + React | 14+ / 18+ |
| Banco de Dados | PostgreSQL | 15+ |
| Cache/Queue | Redis | 7+ |
| Email | Resend | - |

---

← [Voltar para SPEC](README.md) | [Proximo: Arquitetura →](02-arquitetura.md)
