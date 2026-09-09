# Protocolo de Goals — anxionOS

Como agentes usam **CreateGoal** / **UpdateGoal** (Cursor) em conjunto com o registry local e a política do taskboard.

**Relacionados:** [AUTONOMY.md](./AUTONOMY.md) · comando `/goal` · [AGENTS.md](../../AGENTS.md)

---

## Quando usar CreateGoal vs issue ANX-*

| Situação | Usar |
| --- | --- |
| Unidade de trabalho rastreável no board | Issue `ANX-*` (obrigatório) |
| Objetivo multi-turn dentro da issue claimada | `CreateGoal` + `goals register` |
| Pergunta sem alterar arquivos | Nenhum — consulta pura |
| Trabalho novo sem issue | **Criar issue primeiro** — goal não substitui board |

**Regra:** `CreateGoal` **nunca** bypassa a política zero-trabalho-fora-do-board. Todo goal deve referenciar uma issue `in_progress` claimada pela sessão.

---

## Fluxo recomendado

1. `npm run taskboard:ensure`
2. Claim: `node scripts/taskboard.mjs move ANX-N in_progress`
3. Registrar metadados locais:
   ```bash
   npm run orchestration:goals -- register \
     --persona backend-executor \
     --id anx-n-slice \
     --issue ANX-N \
     --objective "Descrição verificável do objetivo"
   ```
4. Na sessão Cursor: `/goal <objective>` ou `CreateGoal` com o **mesmo** objetivo
5. Trabalhar até critérios satisfeitos
6. Auditoria item-a-item (ver abaixo)
7. `UpdateGoal` com `status: complete` **somente** após evidência
8. `npm run orchestration:goals -- complete --persona ... --id ...`
9. Handoff G1+ via diálogo

---

## UpdateGoal complete — critérios

Marcar complete exige **auditoria contra o estado atual**, não intenção:

- Cada requisito explícito do objetivo tem evidência (arquivo, comando, teste)
- Nenhum requisito contradiz o estado do repo
- Evidência fraca ou indireta = **não complete**
- Correções pendentes = manter goal ativo

Comportamento do comando `/goal` (Cursor):

- Goal persiste entre turnos
- Não redefinir sucesso para subset menor
- `UpdateGoal complete` só quando **todos** os requisitos verificados

---

## Proibições

| Proibido | Motivo |
| --- | --- |
| Goal sem issue claimada | Viola taskboard policy |
| Goal que abrange múltiplas issues não relacionadas | Escopo indefinido |
| `complete` sem verificação | Falsa conclusão |
| Goal como substituto de claim | Board é fonte de verdade |

---

## Integração com registry

```bash
npm run orchestration:goals -- list
npm run orchestration:goals -- protocol
npm run orchestration:autonomy -- list --type goals
```

Campos em `registry.json` → `resources.goals[]`:

```json
{
  "id": "anx-134-identity",
  "persona": "backend-executor",
  "issueId": "ANX-134",
  "objective": "Implementar lifecycle identity com testes",
  "status": "active",
  "cursorTool": "CreateGoal"
}
```

Audit: `.cursor/orchestration-runtime/autonomy/autonomy.jsonl`
