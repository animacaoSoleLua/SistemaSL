# 8. Compliance e Politicas

**Versao:** 1.0.0
**Ultima Atualizacao:** 2026-01-20

[← Voltar para Indice PRD](README.md)

---

## 8.1 LGPD (Lei Geral de Protecao de Dados)

### Principios Aplicaveis

| Principio | Implementacao |
|-----------|---------------|
| Finalidade | Dados usados para gestao de equipe e relatorios |
| Adequacao | Coleta alinhada ao trabalho dos membros |
| Necessidade | Apenas dados essenciais |
| Transparencia | Politica clara e acessivel |
| Seguranca | Controle de acesso e logs |

### Requisitos de Implementacao

1. **Consentimento**
   - Opt-in no primeiro acesso
   - Registro de consentimento

2. **Direito ao Acesso**
   - Exportacao de dados do membro
   - Prazo: ate 15 dias

3. **Direito a Exclusao**
   - Exclusao mediante solicitacao
   - Remocao de dados pessoais

4. **Portabilidade**
   - Exportacao em JSON/CSV

### Dados Coletados

| Dado | Finalidade | Base Legal | Retencao |
|------|------------|------------|----------|
| Nome e email | Login e identificacao | Execucao de contrato | Enquanto ativo |
| Perfil e papel | Controle de acesso | Legitimo interesse | Enquanto ativo |
| Relatorios e midia | Registro de eventos | Legitimo interesse | 24 meses |

---

## 8.2 Politicas por Canal

### Email

- Opt-out em todas as mensagens
- Envio apenas para recuperacao e notificacoes internas

---

## 8.3 Seguranca de Dados

### Dados Sensiveis

| Dado | Classificacao | Protecao |
|------|---------------|----------|
| Senhas | Critico | Hash bcrypt |
| Tokens | Critico | Expiracao curta |
| Dados pessoais | Alto | Criptografia em transito |

### Controles de Acesso

- Autenticacao obrigatoria
- Autorizacao por papel
- Logs de auditoria basicos

---

## 8.4 Termos e Politicas

### Documentos Necessarios

- [ ] Termos de uso
- [ ] Politica de privacidade

### Checklist de Compliance

- [ ] Consentimento implementado
- [ ] Exportacao de dados disponivel
- [ ] Exclusao de dados implementada
- [ ] Politica de privacidade publicada

---

[← Voltar para Indice PRD](README.md)
