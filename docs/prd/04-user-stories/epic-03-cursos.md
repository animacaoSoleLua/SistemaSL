# Epic 3: Cursos

**Versao:** 1.0.0
**Ultima Atualizacao:** 2026-01-20

[← Voltar para User Stories](README.md) | [← Voltar para Indice PRD](../README.md)

---

## Descricao do Epic

Permitir criacao de cursos, inscricao de membros e controle de presenca e faltas.

---

## US-014: Criar curso

**Como** administrador
**Quero** criar um curso com vagas e detalhes
**Para que** eu ofereca treinamento

**Prioridade:** Must Have
**Estimativa:** M
**Epic:** Cursos
**Dependencias:** Nenhuma

**Criterios de Aceitacao:**
1. Formulario com titulo, descricao, data, local e vagas
2. Permite definir limite de vagas
3. Salva e mostra confirmacao
4. Curso aparece na lista de cursos
5. Funciona no celular

---

## US-015: Ver inscritos e marcar presenca

**Como** administrador
**Quero** ver inscritos e marcar presenca
**Para que** eu controle quem participou

**Prioridade:** Must Have
**Estimativa:** M
**Epic:** Cursos
**Dependencias:** US-014

**Criterios de Aceitacao:**
1. Lista mostra inscritos por curso
2. Permite marcar presenca ou falta
3. Salva as mudancas
4. Atualiza status do membro no curso
5. Funciona no celular

---

## US-016: Registrar falta

**Como** administrador
**Quero** registrar falta em um curso
**Para que** eu mantenha historico

**Prioridade:** Must Have
**Estimativa:** P
**Epic:** Cursos
**Dependencias:** US-015

**Criterios de Aceitacao:**
1. Admin consegue marcar falta para um membro
2. Falta fica registrada no perfil do membro
3. Falta aparece no historico do curso
4. Funciona no celular

---

## US-017: Ver cursos disponiveis

**Como** membro
**Quero** ver cursos disponiveis
**Para que** eu me inscreva

**Prioridade:** Must Have
**Estimativa:** P
**Epic:** Cursos
**Dependencias:** US-010

**Criterios de Aceitacao:**
1. Lista mostra cursos ativos com data e vagas
2. Indica se ha vagas
3. Permite abrir detalhes
4. Funciona no celular

---

## US-018: Inscrever em curso

**Como** membro
**Quero** me inscrever em um curso
**Para que** eu garanta minha vaga

**Prioridade:** Must Have
**Estimativa:** M
**Epic:** Cursos
**Dependencias:** US-017

**Criterios de Aceitacao:**
1. Botao de inscricao no curso
2. Bloqueia quando vagas acabam
3. Confirmacao de inscricao na tela
4. Curso aparece em "Meus cursos"
5. Funciona no celular

---

## US-019: Ver meus cursos e status

**Como** membro
**Quero** ver meus cursos com status
**Para que** eu acompanhe meu progresso

**Prioridade:** Must Have
**Estimativa:** P
**Epic:** Cursos
**Dependencias:** US-018

**Criterios de Aceitacao:**
1. Lista mostra cursos inscritos, concluidos e faltas
2. Indica status de cada curso
3. Permite abrir detalhes
4. Funciona no celular

---

[← Voltar para User Stories](README.md) | [← Voltar para Indice PRD](../README.md)
