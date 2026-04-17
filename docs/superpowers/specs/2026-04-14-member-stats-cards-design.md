# Design: Redesign dos Stat Cards - Aba de Membros (Gerência)

**Data:** 2026-04-14  
**Status:** Proposta  
**Escopo:** Frontend (gerencia/page.tsx)

---

## Resumo Executivo

Substituir os 4 stat cards da aba "Membros" na página de gerência por métricas mais relevantes para decisões operacionais. Ao invés de mostrar "Total", "Menores", "Administradores" e "Com Advertências", exibir indicadores de **saúde integral do time**: disciplina, satisfação cliente, assiduidade e cancelamentos.

**Motivação:** Os cards atuais mostram dados demográficos pouco acionáveis. Os novos cards mostram saúde operacional do time, permitindo à gerência identificar problemas e oportunidades rapidamente.

---

## Contexto do Negócio

O sistema gerencia membros de uma empresa que oferece serviços de animação/recreação. A gerência precisa monitorar:
- **Saúde dos membros:** Confiabilidade, integridade disciplinar
- **Capacidade de atendimento:** Disponibilidade e comprometimento
- **Performance:** Qualidade do trabalho e satisfação dos clientes
- **Riscos:** Advertências, inatividade, cancelamentos

Os cards devem responder perguntas como:
- "Quantos membros têm problemas disciplinares?"
- "Os clientes estão satisfeitos com nosso trabalho?"
- "Qual o comprometimento do time (assiduidade)?"
- "Quantos membros estão faltando em compromissos?"

---

## Design dos 4 Novos Stat Cards

### 1. Saúde Disciplinar ✅

**Ícone:** Shield com checkmark (verde)  
**Valor exibido:** Percentual (ex: 87%)  
**Label:** "Saúde Disciplinar"  
**Subtítulo:** "Membros sem advertências ativas"

**Cálculo:**
```
(Total de membros - Membros com Warning ativa) / Total * 100

Onde:
- Warning ativa = deletedAt IS NULL
- Total de membros = COUNT(User)
```

**Dados necessários:**
- `User` table (total)
- `Warning` table com `deletedAt` (ativas)

**Comportamento:**
- Carrega sem delay (dados simples)
- Se total = 0, mostra "—"
- Usa cor verde (positivo)

**Interpretação:**
- 90%+: Time saudável
- 70-90%: Atenção moderada
- <70%: Ação necessária

---

### 2. Satisfação do Cliente 😊

**Ícone:** Smile ou heart (âmbar)  
**Valor exibido:** Percentual (ex: 76%)  
**Label:** "Satisfação do Cliente"  
**Subtítulo:** "Feedback positivo últimos 30d"

**Cálculo:**
```
COUNT(ClientFeedback onde type = 'positive' E criado há ≤30 dias)
/ COUNT(ClientFeedback total criado há ≤30 dias) * 100

Onde:
- type IN ('positive', 'negative')
- createdAt >= now() - interval '30 days'
```

**Dados necessários:**
- `ClientFeedback` table com `type` e `createdAt`

**Comportamento:**
- Se não há feedback nos últimos 30d, mostra "—"
- Usa cor âmbar (monitorar)
- Carrega com stats de relatórios

**Interpretação:**
- 80%+: Excelente
- 60-80%: Bom
- <60%: Ação recomendada

---

### 3. Taxa de Assiduidade ✔️

**Ícone:** Chart com checkmark (azul)  
**Valor exibido:** Percentual (ex: 82%)  
**Label:** "Taxa de Assiduidade"  
**Subtítulo:** "Comparecimento em cursos"

**Cálculo:**
```
COUNT(CourseEnrollment onde status = 'attended' E criado há ≤30 dias)
/ COUNT(CourseEnrollment total criado há ≤30 dias) * 100

Onde:
- status IN ('enrolled', 'attended', 'missed')
- createdAt >= now() - interval '30 days'
```

**Dados necessários:**
- `CourseEnrollment` table com `status` e `createdAt`

**Comportamento:**
- Se total de enrollments = 0, mostra "—"
- Usa cor azul (desempenho positivo)
- Mostra o percentual de ATTENDED (sucesso)

**Interpretação:**
- 85%+: Time comprometido
- 70-85%: Adequado
- <70%: Preocupante

---

### 4. Taxa de Cancelamento ❌

**Ícone:** X-circle (vermelho/rosa)  
**Valor exibido:** Percentual (ex: 12%)  
**Label:** "Taxa de Cancelamento"  
**Subtítulo:** "Membros que faltaram"

**Cálculo:**
```
COUNT(CourseEnrollment onde status = 'missed' E criado há ≤30 dias)
/ COUNT(CourseEnrollment total criado há ≤30 dias) * 100

Onde:
- status = 'missed'
- createdAt >= now() - interval '30 days'
```

**Dados necessários:**
- `CourseEnrollment` table com `status = 'missed'`

**Comportamento:**
- Complemento inverso de Assiduidade (attend + missed = ~100%)
- Se total = 0, mostra "—"
- Usa cor vermelha/rosa (alerta, atenção)

**Interpretação:**
- 0-10%: Excelente
- 10-20%: Normal
- >20%: Ação recomendada

---

## Arquitetura de Implementação

### Componentes afetados

1. **Frontend:** `frontend/app/gerencia/page.tsx`
   - Substituir função `renderStats()` quando `activeTab === "membros"`
   - Substituir cálculos de `membersStats`
   - Manter animações e layout existentes

2. **Backend (opcional):** 
   - Se performance for problema, criar endpoint otimizado
   - Por enquanto, usar queries existentes de `getMembers()`, `getReports()`

### Data Flow

```
useEffect (quando ativa tab "membros")
  ↓
loadMembersStats()
  ├─ Query: COUNT(User) - total
  ├─ Query: COUNT(Warning com deletedAt NULL) - disciplina
  ├─ Query: COUNT(ClientFeedback positivo últimos 30d) - satisfação
  ├─ Query: COUNT(CourseEnrollment attended/missed últimos 30d) - assiduidade
  ↓
setMembersStats({ disciplinary, satisfaction, attendance, cancelation })
  ↓
renderStats() → 4 stat-item divs com novo conteúdo
```

### Período de Cálculo

- **Todos os cards:** Baseados em "últimos 30 dias"
- **Exceção:** Saúde Disciplinar usa dados "sempre" (não tem limite temporal)

### Tratamento de Dados Vazios

- Se não houver dados para um período/métrica, exibir "—" (travessão)
- Exemplo: Se não há ClientFeedback últimos 30d, mostrar "—" em Satisfação

---

## Comparação: Antes vs Depois

### Antes
```
Card 1: Total de Membros (👥 12)
Card 2: Menores de Idade (⚠️ 2, 16%)
Card 3: Administradores (👨‍💼 3)
Card 4: Com Advertências (❌ 1)
```
**Problema:** Demográfico, pouco acionável, "Administradores" é inútil

### Depois
```
Card 1: Saúde Disciplinar (✅ 87%)
Card 2: Satisfação do Cliente (😊 76%)
Card 3: Taxa de Assiduidade (✔️ 82%)
Card 4: Taxa de Cancelamento (❌ 12%)
```
**Vantagem:** Operacional, actionable, permite decisões rápidas

---

## Restrições e Considerações

1. **Performance:**
   - Cálculos simples, devem ser rápidos
   - Se > 100k membros, considerar índices ou agregações

2. **Dados vazios:**
   - Satisfação depende de ClientFeedback (pode estar vazio)
   - Assiduidade/Cancelamento dependem de CourseEnrollment (pode estar vazio)

3. **Período fixo:**
   - 30 dias é arbitrário mas comum para métricas
   - Futuro: poderia ter seletor de período (igual Reports/Cursos)

4. **Precisão:**
   - Cálculos baseados em `createdAt` (não em `updatedAt`)
   - Para advertências, usar `deletedAt` para "ativas"

---

## Estilo e Visual

- **Manter:** Layout grid existente, animação fadeUp, spacing
- **Alterar:** 
  - Ícones (novos para cada métrica)
  - Cores (verde, âmbar, azul, vermelho)
  - Labels e subtítulos

- **Classes CSS:**
  - Manter `.stat-item`, `.stat-icon`, `.stat-value`, `.stat-label`
  - Adicionar classes `.stat-icon--success`, `.stat-icon--warning`, `.stat-icon--info`, `.stat-icon--danger`

---

## Testes

### Casos de teste

1. **Sem dados:**
   - Sistema novo: todos cards mostram "—"
   - Sistema com dados: cards mostram valores reais

2. **Com dados parciais:**
   - Sem ClientFeedback: Satisfação mostra "—"
   - Sem CourseEnrollment: Assiduidade/Cancelamento mostra "—"

3. **Períodos:**
   - Dados com >30 dias não são contados
   - Advertências antigas deletadas não são contadas

---

## Próximas Etapas

1. ✅ Design aprovado
2. → Implementar cálculos em `frontend/app/gerencia/page.tsx`
3. → Atualizar icons (usar react-icons existentes ou novos)
4. → Adicionar cores CSS
5. → Testar com dados reais
6. → Deploy

