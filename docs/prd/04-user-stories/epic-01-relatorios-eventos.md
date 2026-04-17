# Epic 1: Relatorios de eventos

**Versao:** 1.0.0
**Ultima Atualizacao:** 2026-01-20

[← Voltar para User Stories](README.md) | [← Voltar para Indice PRD](../README.md)

---

## Descricao do Epic

Permitir que animadores criem relatorios completos dos eventos, com midia e feedbacks, e que o admin consulte e filtre esses relatorios.

---

## US-001: Criar relatorio de evento

**Como** animador
**Quero** criar um relatorio do evento
**Para que** eu registre o que aconteceu

**Prioridade:** Must Have
**Estimativa:** M
**Epic:** Relatorios de eventos
**Dependencias:** Nenhuma

**Criterios de Aceitacao:**
1. Permite preencher campos obrigatorios (data, contratante, local, equipe)
2. Permite descrever o evento em texto
3. Permite avaliar itens como som/microfone e organizacao
4. Salva o relatorio e mostra confirmacao
5. Relatorio aparece em "Meus relatorios" e funciona no celular

**Notas Tecnicas:**
- Campos obrigatorios devem ter validacao

---

## US-002: Anexar fotos e videos

**Como** animador
**Quero** anexar fotos e videos
**Para que** eu comprove o evento

**Prioridade:** Must Have
**Estimativa:** M
**Epic:** Relatorios de eventos
**Dependencias:** US-001

**Criterios de Aceitacao:**
1. Permite anexar varias fotos e videos
2. Mostra previa antes de enviar
3. Envio funciona no celular
4. Arquivos aparecem dentro do relatorio salvo

---

## US-003: Ver meus relatorios

**Como** animador
**Quero** ver meus relatorios anteriores
**Para que** eu acompanhe meu historico

**Prioridade:** Should Have
**Estimativa:** P
**Epic:** Relatorios de eventos
**Dependencias:** US-001

**Criterios de Aceitacao:**
1. Lista mostra apenas meus relatorios
2. Ordena por data (mais recentes primeiro)
3. Permite abrir detalhes
4. Funciona no celular

---

## US-004: Admin ver todos os relatorios

**Como** administrador
**Quero** ver todos os relatorios
**Para que** eu acompanhe a equipe

**Prioridade:** Must Have
**Estimativa:** M
**Epic:** Relatorios de eventos
**Dependencias:** US-001

**Criterios de Aceitacao:**
1. Lista mostra relatorios de todos os animadores
2. Permite abrir qualquer relatorio
3. Mostra autor e data do evento
4. Funciona no celular

---

## US-005: Filtrar e buscar relatorios

**Como** administrador
**Quero** buscar e filtrar relatorios
**Para que** eu encontre rapidamente

**Prioridade:** Should Have
**Estimativa:** M
**Epic:** Relatorios de eventos
**Dependencias:** US-004

**Criterios de Aceitacao:**
1. Filtro por periodo (data inicial/final)
2. Filtro por animador
3. Busca por nome do evento/contratante
4. Lista atualiza conforme filtros
5. Funciona no celular

---

## US-006: Ver feedbacks individuais

**Como** administrador
**Quero** ver feedbacks individuais no relatorio
**Para que** eu avalie cada membro

**Prioridade:** Must Have
**Estimativa:** M
**Epic:** Relatorios de eventos
**Dependencias:** US-001

**Criterios de Aceitacao:**
1. Relatorio permite registrar feedback por membro
2. Mostra nome do membro e observacao
3. Admin ve feedbacks no detalhe
4. Funciona no celular

---

[← Voltar para User Stories](README.md) | [← Voltar para Indice PRD](../README.md)
