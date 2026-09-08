## Resumo

<!-- O que mudou e por quê (PT-BR) -->

## Tipo de mudança

- [ ] Documentação do repositório público (README, AGENTS.md, CONTRIBUTING) — **não** incluir `brain/`
- [ ] Decisão (ADR novo ou atualizado)
- [ ] Código (`backend/` ou tooling)
- [ ] CI / repositório

## Issue no taskboard (obrigatório — PR sem ANX-* = rejeitar)

**ANX-___** <!-- Preencher identificador; deve estar em in_review ao abrir o PR -->

## Checklist

- [ ] Li [AGENTS.md](../AGENTS.md) e o escopo está alinhado (sem scaffold não autorizado).
- [ ] **Política zero-trabalho-fora-do-board:** trabalho iniciado só após `taskboard:ensure` + claim `in_progress` na issue acima.
- [ ] Issue **ANX-*** vinculada no título ou corpo; status `in_review` ao abrir PR; `done` após merge/aceite explícito.
- [ ] Não fechei sessão com issue desatualizada no board.
- [ ] Se a mudança altera contrato ou arquitetura: specs/ADRs atualizados em `brain/` **local** (fora deste git).
- [ ] Se editou OKF localmente: frontmatter/templates respeitados (não commitar `brain/` aqui).
- [ ] Nenhum segredo, `.env` ou dump sensível incluído.
- [ ] **Código:** testes e validação conforme gates AR01–AR06 / SDD do pacote P0x ativo.
- [ ] Comunicação e descrição do PR em PT-BR (identificadores técnicos em inglês ok).

## Como validar

<!-- Passos para o revisor reproduzir -->
