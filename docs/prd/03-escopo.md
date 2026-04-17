# 3. Escopo do Produto

**Versao:** 1.0.0
**Ultima Atualizacao:** 2026-01-20

[← Voltar para Indice PRD](README.md) | [Anterior: Contexto](02-contexto-personas.md) | [Proximo: User Stories →](04-user-stories/README.md)

---

## 3.1 No Escopo (MVP)

Funcionalidades que SERAO implementadas na primeira versao:

### Funcionalidades Essenciais (Must Have)

1. **Relatorios de eventos**
   - Criacao de relatorios com fotos e videos

2. **Gestao de membros e perfis**
   - Login, perfis e controle de acesso por papel

3. **Cursos e inscricoes**
   - Criacao de cursos e controle de vagas

4. **Advertencias e suspensao**
   - Registro de advertencias e regra de 3 advertencias

### Funcionalidades Importantes (Should Have)

5. **Exportacao de relatorios em PDF**
   - Facilita compartilhamento e arquivo

6. **Filtros e busca por periodo/membro**
   - Encontra relatorios e pessoas rapidamente

---

## 3.2 Fora do Escopo (MVP)

Funcionalidades que NAO SERAO implementadas no MVP:

- ❌ Sistema de pagamento
- ❌ Chat nativo
- ❌ App mobile nativo
- ❌ Integracao com WhatsApp (fica para V2)

---

## 3.3 Roadmap Futuro

### V1.1 (Apos MVP)
- 📋 Exportacao em PDF
- 📋 Filtros por periodo e busca avancada
- 📋 Historico de cursos com certificado

### V2.0 (Longo Prazo)
- 📋 Modulo de RH
- 📋 Integracao com WhatsApp
- 📋 Relatorios avancados e comparativos

---

## 3.4 Premissas

Condições que assumimos como verdadeiras:

1. **Usuarios tem internet e celular/computador**
   - Impacto se falsa: sistema nao funciona no local

2. **Equipe possui email para login**
   - Impacto se falsa: nao e possivel acessar o sistema

3. **Dados basicos dos membros estarao disponiveis**
   - Impacto se falsa: cadastro inicial fica atrasado

---

## 3.5 Restricoes

Limitações conhecidas do projeto:

### Restricoes Tecnicas
- Hospedagem em VPS com custo baixo
- Armazenamento de midia com limite de custo

### Restricoes de Negocio
- Prazo curto (1 semana para MVP)
- Orcamento mensal ate R$ 300

### Restricoes Legais/Regulatorias
- Adequacao basica a LGPD

---

## 3.6 Dependencias Externas

| Dependencia | Tipo | Status | Responsavel |
|-------------|------|--------|-------------|
| Resend (email) | Integracao | Planejado | Time tecnico |
| Object Storage (midia) | Infra | Planejado | Time tecnico |

---

[← Voltar para Indice PRD](README.md) | [Proximo: User Stories →](04-user-stories/README.md)
