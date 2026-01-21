# Epic 4: Advertencias

**Versao:** 1.0.0
**Ultima Atualizacao:** 2026-01-20

[← Voltar para User Stories](README.md) | [← Voltar para Indice PRD](../README.md)

---

## Descricao do Epic

Registrar advertencias de membros, permitir consulta e aplicar regra de suspensao.

---

## US-020: Criar advertencia

**Como** animador ou administrador
**Quero** criar uma advertencia para um membro
**Para que** eu registre um problema

**Prioridade:** Must Have
**Estimativa:** M
**Epic:** Advertencias
**Dependencias:** US-010

**Criterios de Aceitacao:**
1. Formulario com membro, motivo e data
2. Salva e mostra confirmacao
3. Advertencia aparece no perfil do membro
4. Quem criou fica registrado
5. Funciona no celular

---

## US-021: Ver advertencias que dei

**Como** animador ou administrador
**Quero** ver as advertencias que eu dei
**Para que** eu acompanhe meu historico

**Prioridade:** Should Have
**Estimativa:** P
**Epic:** Advertencias
**Dependencias:** US-020

**Criterios de Aceitacao:**
1. Lista mostra apenas advertencias criadas por mim
2. Ordena por data (mais recentes primeiro)
3. Permite abrir detalhes
4. Funciona no celular

---

## US-022: Apagar advertencia

**Como** administrador
**Quero** apagar uma advertencia
**Para que** eu corrija erros

**Prioridade:** Must Have
**Estimativa:** P
**Epic:** Advertencias
**Dependencias:** US-020

**Criterios de Aceitacao:**
1. Admin consegue apagar advertencia
2. Pede confirmacao antes de apagar
3. Advertencia some do perfil do membro
4. Registra quem apagou e quando
5. Funciona no celular

---

## US-023: Ver minhas advertencias

**Como** membro
**Quero** ver minhas advertencias
**Para que** eu entenda minha situacao

**Prioridade:** Must Have
**Estimativa:** P
**Epic:** Advertencias
**Dependencias:** US-010

**Criterios de Aceitacao:**
1. Lista mostra minhas advertencias
2. Mostra motivo e data
3. Indica quantidade total
4. Mostra status de suspensao quando chegar a 3
5. Funciona no celular

---

## US-024: Alertar suspensao por 3 advertencias

**Como** sistema
**Quero** alertar quando alguem tiver 3 advertencias
**Para que** a regra de 1 mes sem trabalhar seja aplicada

**Prioridade:** Must Have
**Estimativa:** M
**Epic:** Advertencias
**Dependencias:** US-020

**Criterios de Aceitacao:**
1. Ao chegar a 3 advertencias, marca "suspenso por 1 mes"
2. Admin ve alerta no perfil do membro
3. Membro ve aviso no proprio perfil
4. Guarda data de inicio e fim da suspensao
5. Funciona no celular

---

[← Voltar para User Stories](README.md) | [← Voltar para Indice PRD](../README.md)
