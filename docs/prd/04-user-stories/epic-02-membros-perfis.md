# Epic 2: Gestao de membros e perfis

**Versao:** 1.0.0
**Ultima Atualizacao:** 2026-01-20

[← Voltar para User Stories](README.md) | [← Voltar para Indice PRD](../README.md)

---

## Descricao do Epic

Permitir cadastro, login e gestao de perfis por papel (admin, animador, recreador), garantindo acesso ao que cada pessoa precisa.

---

## US-007: Cadastrar membro e papel

**Como** administrador
**Quero** cadastrar membros e definir o papel
**Para que** eu controle o acesso

**Prioridade:** Must Have
**Estimativa:** M
**Epic:** Gestao de membros e perfis
**Dependencias:** Nenhuma

**Criterios de Aceitacao:**
1. Formulario com nome, email e papel
2. Validacao de email e papel obrigatorio
3. Salva e mostra confirmacao
4. Novo membro aparece na lista
5. Funciona no celular

---

## US-008: Editar ou excluir membro

**Como** administrador
**Quero** editar ou excluir um membro
**Para que** eu mantenha dados atualizados

**Prioridade:** Must Have
**Estimativa:** M
**Epic:** Gestao de membros e perfis
**Dependencias:** US-007

**Criterios de Aceitacao:**
1. Permite editar nome, email e papel
2. Permite excluir membro
3. Mostra confirmacao de salvamento/exclusao
4. Mudancas aparecem na lista e no perfil
5. Funciona no celular

---

## US-009: Ver lista de membros (admin)

**Como** administrador
**Quero** ver a lista de membros
**Para que** eu acompanhe a equipe

**Prioridade:** Must Have
**Estimativa:** P
**Epic:** Gestao de membros e perfis
**Dependencias:** US-007

**Criterios de Aceitacao:**
1. Lista mostra membros com papel e contato basico
2. Permite filtrar por nome ou email
3. Acesso rapido para editar membro
4. Funciona no celular

---

## US-010: Login com recuperacao de senha

**Como** membro
**Quero** fazer login e recuperar senha
**Para que** eu acesse meu perfil

**Prioridade:** Must Have
**Estimativa:** M
**Epic:** Gestao de membros e perfis
**Dependencias:** US-007

**Criterios de Aceitacao:**
1. Tela de login com email e senha
2. Mensagem clara em caso de erro
3. Recuperacao de senha por email
4. Redireciona para area do membro
5. Funciona no celular

---

## US-011: Ver perfil com cursos e advertencias

**Como** membro
**Quero** ver meu perfil com cursos e advertencias
**Para que** eu acompanhe meu progresso

**Prioridade:** Must Have
**Estimativa:** M
**Epic:** Gestao de membros e perfis
**Dependencias:** US-010

**Criterios de Aceitacao:**
1. Perfil mostra dados basicos
2. Lista de cursos feitos/inscritos
3. Lista de advertencias recebidas
4. Mostra status simples de progresso
5. Funciona no celular

---

## US-012: Ver lista de membros (membro)

**Como** membro
**Quero** ver a lista de membros
**Para que** eu tenha uma visao geral da equipe

**Prioridade:** Should Have
**Estimativa:** P
**Epic:** Gestao de membros e perfis
**Dependencias:** US-010

**Criterios de Aceitacao:**
1. Lista mostra nome, funcao e contato basico
2. Permite buscar por nome
3. Nao mostra dados sensiveis
4. Funciona no celular

---

## US-013: Editar dados e foto de perfil

**Como** membro
**Quero** editar meus dados e foto
**Para que** meu perfil fique atualizado

**Prioridade:** Must Have
**Estimativa:** M
**Epic:** Gestao de membros e perfis
**Dependencias:** US-010

**Criterios de Aceitacao:**
1. Permite editar dados pessoais
2. Valida campos obrigatorios
3. Mostra confirmacao de salvamento
4. Mudancas aparecem no perfil
5. Permite adicionar foto de perfil
6. Funciona no celular

---

[← Voltar para User Stories](README.md) | [← Voltar para Indice PRD](../README.md)
