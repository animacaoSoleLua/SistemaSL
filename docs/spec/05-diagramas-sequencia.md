# 5. Diagramas de Sequencia

**Versao:** 1.0.0
**Ultima Atualizacao:** 2026-01-20

← [Voltar para SPEC](README.md)

---

## 5.1 Fluxo de Autenticacao

```mermaid
sequenceDiagram
    participant U as Usuario
    participant F as Frontend
    participant A as API
    participant D as Database

    U->>F: Preenche login
    F->>A: POST /auth/login
    A->>D: Busca usuario por email
    D-->>A: Dados do usuario
    A->>A: Valida senha e gera JWT
    A-->>F: { token, user }
    F-->>U: Acesso liberado
```

---

## 5.2 Fluxo de Criacao de Relatorio

```mermaid
sequenceDiagram
    participant A as Animador
    participant F as Frontend
    participant API as API
    participant S3 as Storage
    participant DB as Database

    A->>F: Preenche relatorio
    F->>S3: Upload de midia
    F->>API: POST /relatorios
    API->>DB: Salva relatorio e midias
    DB-->>API: OK
    API-->>F: Confirmacao
```

---

## 5.3 Fluxo de Inscricao em Curso

```mermaid
sequenceDiagram
    participant M as Membro
    participant F as Frontend
    participant API as API
    participant DB as Database

    M->>F: Escolhe curso
    F->>API: POST /cursos/:id/inscricoes
    API->>DB: Verifica vagas
    alt Vaga disponivel
        DB-->>API: OK
        API->>DB: Cria inscricao
        API-->>F: Confirmacao
    else Sem vagas
        API-->>F: Erro de vaga
    end
```

---

← [Voltar para SPEC](README.md) | [Proximo: Maquina de Estados →](06-maquina-estados.md)
