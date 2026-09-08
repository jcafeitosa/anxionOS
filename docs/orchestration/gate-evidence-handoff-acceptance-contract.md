---
title: "G0–G7 — Pacote de evidências, handoff e aceite"
description: "Contrato comum para provar revisão, QA, segurança, red team, integração e aceite do roadmap."
type: spec
status: draft
owner: "anxionOS"
issue: ANX-66
tags:
  - gates
  - evidence
  - handoff
  - review
  - qa
  - security
  - red-team
  - acceptance
---

# G0–G7 — Pacote de evidências, handoff e aceite

## 1. Finalidade

Este documento define o registro mínimo para cada gate do roadmap P01–P09. Status de issue, comentário, documentação ou teste isolado não provam um gate. A prova deve apontar para o mesmo candidato/revisão, ambiente, escopo e critérios.

O pacote é aplicável a código, contratos, documentação, testes, infraestrutura e consoles. Para entrega documental, os gates avaliam coerência, rastreabilidade e lacunas; não inventam testes de produto.

## 2. Identidade do candidato

Cada execução possui:

- `issueId`, run id, thread/owner e dependências;
- revisão, commit/digest ou hash do artefato;
- objetivo, escopo, não-escopo e critérios;
- ambiente, configuração sanitizada e data/hora;
- arquivos/artefatos examinados;
- comandos, fixtures, dataset e resultado bruto;
- limitações, ferramentas indisponíveis e evidência obsoleta;
- findings com severidade, status, owner e issue de retorno.

Qualquer mudança material invalida aprovações afetadas. O coordenador deve calcular impacto, repetir o gate ou registrar revalidação explícita com o novo digest.

## 3. Formato do parecer

Cada parecer usa:

`{ gate, issue, runId, reviewer, independence, candidateDigest, scope, criteria, evidence, findings, decision, residualRisk, limitations, nextAction }`

`decision` é exatamente um de:

- `PASS`: todos os critérios aplicáveis demonstrados;
- `CHANGES_REQUIRED`: achados corrigíveis impedem avanço;
- `BLOCKED`: dependência, ambiente ou ferramenta impede prova;
- `NOT_APPLICABLE`: escopo não se aplica, com justificativa verificável e concordância do responsável.

Timeout, falta de ferramenta, orçamento esgotado ou silêncio nunca viram PASS.

## 4. Gates

| Gate | Responsável | Evidência de saída |
| --- | --- | --- |
| G0 — Preparar | orquestrador + executor | issue claimada, ownership, crítico distinto, escopo, critérios, dependências, ambiente e pacote aberto |
| G1 — Desenvolver | executor + crítico | implementação/artefato, testes proporcionais, revisão objetiva do crítico, achados impeditivos resolvidos |
| G2 — Code Review | equipe independente | contratos, arquitetura, concorrência, manutenção, migração, testes e diff completos revisados |
| G3 — QA | equipe independente | critérios funcionais, negativos, integração, regressão e E2E executados com comandos/resultados |
| G4 — Security | equipe independente | tenancy/RLS, auth, secrets, fronteiras, dependências, exposição e testes de abuso avaliados |
| G5 — Red Team | equipe independente | cenários autorizados em sandbox, reprodução, impacto, cleanup e controles que resistiram |
| G6 — Integrar | orquestrador + responsáveis | candidato integrado revalidado, dependências reconciliadas e evidências não obsoletas |
| G7 — Aceitar/liberar | usuário/revisor autorizado | aceite explícito, release checklist, observabilidade, rollback e escopo de deploy autorizados |

A aprovação do crítico é condição para handoff a G2–G5, mas não substitui nenhuma equipe. Uma equipe que corrige torna-se executor daquela mudança e precisa de novo revisor independente.

## 5. Handoff

O handoff inclui issue, candidato/digest, requisitos, artefatos, ambiente, comandos, evidências, findings, limites de acesso, critérios do próximo gate e mecanismo de retorno. O receptor confirma recebimento, identidade e escopo.

Handoff não transfere automaticamente ownership do board, grants, secrets ou authority. O board preserva status/claim; o parecer preserva a decisão. Relações entre issues devem registrar dependências reais e não duplicar claims.

## 6. Achados e retorno

Severidades crítica/alta ou requisito obrigatório falho bloqueiam. Médio/baixo exige correção ou disposição explícita do responsável autorizado, com justificativa e issue rastreável. O autor não aceita unilateralmente seu próprio risco.

Correção retorna a issue para `in_progress`, gera novo digest e repete o crítico e os gates afetados. Não se reaproveita PASS automaticamente. Após três ciclos sem convergência, registrar impasse com evidências e escalar; não reduzir critérios.

## 7. Readiness integrado

O roadmap só pode afirmar “pronto para o próximo ambiente” quando a matriz contém PASS para cada requisito obrigatório do modo pretendido. SIMULATED/PAPER e REAL são candidatos distintos. Evidência paper não aprova live.

Checklist transversal:

- contratos e schemas versionados;
- tenancy, RLS e authority;
- journal/outbox/inbox, retry, DLQ e UNKNOWN;
- secrets e isolamento de ambientes;
- concorrência, leases e fencing;
- market data, ledger, posições e reconciliação;
- agentes, skills, memória, budgets e takeover;
- observabilidade, SLO, backup, restore e rollback;
- consoles e acessibilidade aplicáveis;
- custo, retenção, privacidade e exportação;
- limitações e riscos residuais.

## 8. Restrições de segurança

Gates não autorizam capital real, execução live, L3/L4, credenciais reais ou ataques fora de sandbox. Red Team usa fixtures e cleanup. Logs e pareceres não contêm secrets. Qualquer suspeita de vazamento, bypass de autoridade ou estado financeiro UNKNOWN mantém o candidato bloqueado até resolução.

## 9. Critérios de aceite deste contrato

- Um parecer inválido por falta de digest, reviewer, escopo ou evidência é rejeitado.
- Mudança material produz candidato novo e invalida pareceres afetados.
- O fluxo de retorno é reproduzível e rastreável no board.
- G2, G3, G4 e G5 permanecem independentes.
- G6 verifica o conjunto, não apenas filhos isolados.
- G7 requer aceite explícito; `in_review` não significa aprovado.
- O pacote diferencia documental, teste, revisão, bloqueio e aceite.

## 10. Referências

- [Roadmap de execução](./execution-roadmap.md)
- [Matriz de prontidão](./gate-readiness-matrix.md)
- [Contrato P01/P02](./system-capabilities/p01-p02-contracts-and-gates.md)
- [Contrato P07 de agentes](./system-capabilities/p07-agents-memory-evolution-contract.md)
- [Contrato P08 operacional](./system-capabilities/p08-operations-slos-recovery-contract.md)
