# Indice da Documentacao

**Navegacao completa para toda a documentacao do projeto**

---

## Quick Links

| Documento | Descricao | Quando Usar |
|-----------|-----------|-------------|
| [STATUS.md](STATUS.md) | Estado atual do projeto | Sempre ao iniciar |
| [../README.md](../README.md) | Visao geral do projeto | Contextualizacao |
| [prd/README.md](prd/README.md) | Indice do PRD | Requisitos |
| [spec/README.md](spec/README.md) | Indice da SPEC | Implementacao |

---

## PRD - Product Requirements Document

| # | Documento | Conteudo |
|---|-----------|----------|
| 01 | [Visao e Objetivos](prd/01-visao-objetivos.md) | Problema, solucao, metas |
| 02 | [Contexto e Personas](prd/02-contexto-personas.md) | Usuarios e dores |
| 03 | [Escopo](prd/03-escopo.md) | Limites e roadmap |
| 04 | [User Stories](prd/04-user-stories/) | Epics e historias |
| 05 | [RNFs](prd/05-rnf.md) | Requisitos nao funcionais |
| 06 | [Priorizacao](prd/06-priorizacao.md) | MoSCoW |
| 07 | [Dependencias](prd/07-dependencias.md) | Integracoes |
| 08 | [Compliance](prd/08-compliance.md) | LGPD |
| 09 | [Metricas](prd/09-metricas.md) | KPIs |
| 10 | [Riscos](prd/10-riscos.md) | Riscos |
| 11 | [Glossario](prd/11-glossario.md) | Termos |

### User Stories por Epic

| Epic | Descricao | User Stories |
|------|-----------|--------------|
| [Epic 01](prd/04-user-stories/epic-01-relatorios-eventos.md) | Relatorios | US-001 a US-006 |
| [Epic 02](prd/04-user-stories/epic-02-membros-perfis.md) | Membros/Perfis | US-007 a US-013 |
| [Epic 03](prd/04-user-stories/epic-03-cursos.md) | Cursos | US-014 a US-019 |
| [Epic 04](prd/04-user-stories/epic-04-advertencias.md) | Advertencias | US-020 a US-024 |
| [Epic 05](prd/04-user-stories/epic-05-dashboard-analitica.md) | Dashboard | US-025 a US-028 |

---

## SPEC - Technical Specification

| # | Documento | Conteudo |
|---|-----------|----------|
| 01 | [Visao Geral](spec/01-visao-geral.md) | Objetivo tecnico |
| 02 | [Arquitetura](spec/02-arquitetura.md) | Componentes |
| 03 | [Modelo de Dados](spec/03-modelo-dados.md) | Tabelas |
| 04 | [Contratos API](spec/04-contratos-api/) | Endpoints |
| 05 | [Diagramas Sequencia](spec/05-diagramas-sequencia.md) | Fluxos |
| 06 | [Maquina Estados](spec/06-maquina-estados.md) | Estados |
| 07 | [Tratamento Erros](spec/07-tratamento-erros.md) | Padroes |
| 08 | [Estrategia Testes](spec/08-estrategia-testes.md) | Plano |
| 09 | [Deployment](spec/09-deployment.md) | Infra |
| 10 | [Observabilidade](spec/10-observabilidade.md) | Logs |
| 11 | [Seguranca](spec/11-seguranca.md) | Auth |
| 12 | [Performance](spec/12-performance.md) | Metas |
| 13 | [Rastreabilidade](spec/13-rastreabilidade.md) | US -> Endpoints |

### APIs por Dominio

| Dominio | Endpoints |
|---------|-----------|
| [Auth](spec/04-contratos-api/auth.md) | Login e reset |
| [Membros](spec/04-contratos-api/membros.md) | CRUD |
| [Relatorios](spec/04-contratos-api/relatorios.md) | Criacao e midia |
| [Cursos](spec/04-contratos-api/cursos.md) | Inscricao e presenca |
| [Advertencias](spec/04-contratos-api/advertencias.md) | Criacao e exclusao |
| [Dashboard](spec/04-contratos-api/dashboard.md) | Resumos |

---

## Documentos Operacionais

| Documento | Descricao |
|-----------|-----------|
| [STATUS.md](STATUS.md) | Progresso |
| [MANUTENCAO.md](MANUTENCAO.md) | Guia de manutencao |
| [../CHANGELOG.md](../CHANGELOG.md) | Historico |

---

**Ultima Atualizacao:** 2026-01-20
