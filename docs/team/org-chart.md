# Organograma da equipe anxionOS

Hierarquia **circular** de agentes humanos e IA para desenvolvimento full-stack governado. Mandato desce (C→B→A→Workers); evidência e revisão sobem (Workers→A→B→C).

## Princípio circular

Não é silo rígido: cada nível **revisa** o inferior e **reporta** ao superior, mas feedback de qualidade, risco e produto **retorna** ao topo com evidência verificável (gates G0–G7 em [AGENTS.md](../../AGENTS.md)).

```mermaid
flowchart LR
  subgraph C["Level C — Estratégia / Produto"]
    CEO[CEO Agent]
    CIO[CIO]
    CRO[CRO]
    COO[COO]
    CFO[CFO]
    CCO[CCO]
  end

  subgraph B["Level B — Orquestração técnica"]
    CTO[CTO Orchestrator]
    TLB[Tech Lead Backend]
    TLF[Tech Lead Frontend]
    TLP[Tech Lead Platform/Infra]
  end

  subgraph A["Level A — Execução sênior"]
    ARCH[Code Architects]
    REV[Reviewers G2]
    QA[QA G3]
    SEC[Security G4]
    RED[Red Team G5]
  end

  subgraph W["Workers"]
    IMPL[Implementadores ANX-*]
  end

  CEO --> CTO
  CTO --> TLB & TLF & TLP
  TLB & TLF & TLP --> ARCH & REV & QA & SEC & RED
  ARCH & REV & QA & SEC & RED --> IMPL
  IMPL -.->|evidência, testes, diff| REV & QA
  REV & QA -.->|parecer G2/G3| CTO
  SEC & RED -.->|parecer G4/G5| CCO & CRO
  CTO -.->|status in_review, riscos| CEO
  CIO & CRO & COO & CFO -.->|mandato de domínio| CTO
```

## Level C — Estratégia e produto institucional

| Papel | Responsabilidade | Taskboard | Archify | Graphify |
| --- | --- | --- | --- | --- |
| **CEO Agent** | Missão, priorização, aceite G7 | Autoriza todo; aceita done | Diagramas plataforma | Visão corpus |
| **CIO** | Investimentos, P03+ | phase-N investimento | Investment workflow | explain investimento |
| **CRO** | Risco, Red Team | Issues risco | Fluxos autoridade | Módulos risco |
| **COO** | Operações, connections | P04+ | Connections workflow | path bindings |
| **CFO** | Finanças, capital | Issues financeiras | Dataflow capital | — |
| **CCO** | Governança, ADRs | ADRs review | ADR specs | Audit docs |

## Level B — Orquestração técnica

| Papel | Responsabilidade | Taskboard | Archify | Graphify |
| --- | --- | --- | --- | --- |
| **CTO Orchestrator** | Despacha workers G0–G1 | claim in_progress | P01–P09 | query código |
| **Tech Lead Backend** | backend/, contratos | backend issues | Modular layout | API callers |
| **Tech Lead Frontend** | frontend/, design system | frontend P07+ | Consoles | componentes |
| **Tech Lead Platform** | Docker, CI | infra issues | Platform arch | deploy paths |

## Level A — Gates G0–G7

Code Architects (G0), Reviewers (G2), QA (G3), Security (G4), Red Team (G5) — parecer independente na issue ANX-*.

## Especialistas

Graph, Connections, Identity, Design System, A11y, DevOps — consulta transversal.

## Workers

Um issue ANX-* por unidade; binding de thread; evidência antes de in_review.

## RACI simplificado

| Atividade | C | CTO | A | Workers |
| --- | --- | --- | --- | --- |
| Priorizar | A/R | C | I | I |
| Implementar | I | A | C | R |
| Aceite G7 | A/R | C | I | I |

*Personas em brain/notes/anxionos-team-personas.md (local).*
