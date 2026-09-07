# anxionOS

anxionOS é uma plataforma multi-tenant de investimentos autônomos governados por um **grafo institucional**: agências, agentes, modelos, estratégias, capital e decisões conectados com autoridade, risco e auditoria explícitos. Humanos e agentes compartilham contratos de domínio; a apresentação varia por papel (Owner, operador, plataforma, parceiro).

O repositório está em **fase de especificação e planejamento**. Não há aplicação `backend/` implantada nem código de produto verificado neste momento. A documentação canônica vive em `brain/` (Open Knowledge / OKF), com ADRs, specs e notas de arquitetura.

## Começar aqui

| Recurso | Descrição |
| --- | --- |
| [AGENTS.md](AGENTS.md) | Guia operacional para humanos e agentes (fontes de verdade, gates, o que não fazer) |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Como contribuir com documentação e, futuramente, código |
| [brain/index.md](brain/index.md) | Índice da knowledge base |

## Estrutura do repositório

```
anxionOS/
├── AGENTS.md          # Instruções para agentes e desenvolvedores
├── brain/             # Documentação OKF (specs, ADRs, notas, pesquisa)
├── .github/           # Templates de issue/PR e CI mínimo (fase docs)
└── backend/           # (futuro) apps, modules, packages — ver ADR0002
```

A organização modular do backend está **aceita** em [ADR0002](brain/project-docs/decisions/0002-adopt-modular-backend-layout.md) e detalhada em [anxionos-backend-structure.md](brain/notes/anxionos-backend-structure.md). A implementação segue o roadmap P01–P09 do [SDD institucional](brain/project-docs/specs/001-institutional-contract/spec.md), somente após greenlight explícito.

## Contribuir

1. Leia [AGENTS.md](AGENTS.md) e [CONTRIBUTING.md](CONTRIBUTING.md).
2. Para decisões de arquitetura, use ADRs em `brain/project-docs/decisions/`.
3. Comunicação em **português (PT-BR)**; identificadores técnicos podem seguir inglês.

## Licença

Este projeto está licenciado sob a [MIT License](LICENSE).

## Decisões em aberto

- [ADR0001](brain/project-docs/decisions/0001-graph-operational-domain-authority.md) — grafo operacional (proposto)
- [ADR0003](brain/project-docs/decisions/0003-tool-gateway-module-placement.md) — módulo Tool Gateway (proposto)
