# Design system — anxionOS

Documentação do design system (ui-ux-pro-max). **Tokens e overrides permanecem co-localizados com o frontend** para facilitar implementação; este índice centraliza os caminhos canônicos.

## Caminhos canônicos

| Recurso | Caminho | Descrição |
| --- | --- | --- |
| Master (tokens globais) | [frontend/design-system/MASTER.md](../../frontend/design-system/MASTER.md) | Paleta, tipografia, componentes |
| Overrides por página | `frontend/design-system/pages/` | Regras que sobrescrevem o Master |
| CSS tokens | `frontend/src/styles/global.css` | `@theme` Tailwind |
| Variante `anxionos/` | `frontend/design-system/anxionos/` | Master alternativo / namespace |

## Regra de precedência

1. Verificar `frontend/design-system/pages/[page-name].md` — se existir, **sobrescreve** o Master.
2. Caso contrário, seguir `frontend/design-system/MASTER.md`.

## Documentação relacionada

- [Frontend](../frontend/README.md)
- [Org chart da equipe](../team/org-chart.md)
