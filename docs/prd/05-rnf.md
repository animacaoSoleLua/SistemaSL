# 5. Requisitos Nao Funcionais

**Versao:** 1.0.0
**Ultima Atualizacao:** 2026-01-20

[← Voltar para Indice PRD](README.md)

---

## RNF-01: Performance e Latencia

**Requisito:** O sistema deve responder rapidamente.

**Criterios:**
- Tempo de resposta da API: p95 < 300ms
- Tempo de carregamento de pagina: < 3 segundos
- Operacoes em lote: < 30 segundos

---

## RNF-02: Escalabilidade

**Requisito:** Suportar crescimento sem reescrita.

**Criterios:**
- Suportar 20 usuarios simultaneos no pico
- Suportar 100.000 registros no banco
- Escalar horizontalmente quando necessario

---

## RNF-03: Disponibilidade

**Requisito:** Sistema disponivel para uso diario.

**Criterios:**
- Uptime: 99.5%
- Downtime maximo: 3 horas/mes
- Recuperacao de falhas: < 30 minutos

---

## RNF-04: Seguranca

**Requisito:** Proteger dados e acessos.

**Criterios:**
- Autenticacao via JWT
- HTTPS obrigatorio
- Senhas com hash bcrypt
- Rate limiting basico

---

## RNF-05: Compliance

**Requisito:** Adequacao basica a LGPD.

**Criterios:**
- Consentimento para dados pessoais
- Exportacao e exclusao sob solicitacao
- Politica de privacidade publicada

---

## RNF-06: Observabilidade

**Requisito:** Monitoramento basico de erros e performance.

**Criterios:**
- Logs estruturados
- Alertas para erros 5xx
- Metricas basicas de latencia

---

## RNF-07: Usabilidade

**Requisito:** Interface simples e responsiva.

**Criterios:**
- Funciona no celular
- Fluxos claros sem manual
- Feedback visual em acoes

---

## RNF-08: Manutenibilidade

**Requisito:** Codigo facil de manter.

**Criterios:**
- Testes unitarios principais
- Documentacao de API
- Padroes de codigo

---

## RNF-09: Rate Limiting

**Requisito:** Proteger APIs contra abuso.

**Criterios:**
- 100 req/min por usuario
- 30 req/seg global

---

## RNF-10: Backup e Recuperacao

**Requisito:** Dados recuperaveis em falhas.

**Criterios:**
- Backup diario do banco
- Retencao de 7 dias
- RTO 2 horas, RPO 24 horas

---

[← Voltar para Indice PRD](README.md)
