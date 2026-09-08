# Padrões de visualização de logs (ANX-26)

Página de comparação para escolha do padrão de UI do log viewer no console Owner/Operator.

**Preview:** [http://localhost:4321/dev/log-patterns](http://localhost:4321/dev/log-patterns)

**Dados mock:** alinhados ao shape estruturado previsto (timestamp ISO-8601, `level`, `category`, `message`, `requestId`, `meta` opcional). Sem backend real nesta fase.

---

## Padrão A — Terminal / CLI

```
┌─ Filtros: [Buscar] [Info][Erro] [Auth][API]… ─────────────────────────┐
│ 08/09 20:45:10  [INFO]  🔑 Autenticação  Sessão criada…  req-a1b2c3d4  >│
│ 08/09 20:45:08  [ERROR] ✉ E-mail        Falha SMTP…       req-m3n4o5p6  v│
│   { "smtpHost": "smtp.demo.local", "error": "ETIMEDOUT" }                │
└──────────────────────────────────────────────────────────────────────────┘
```

**Prós**

- Familiar para devs e SRE; JSON meta colapsável
- Alta densidade de informação por linha
- Fácil copiar/colar linhas inteiras

**Contras**

- Pouco intuitivo para Owner não técnico
- Mobile exige scroll horizontal em metadados longos
- Scan visual de erros em volume alto é cansativo

---

## Padrão B — Tabela (Data table)

```
┌─ Hora ▼ │ Nível │ Categoria │ Mensagem              │ Request ID ────────┐
│▌08/09… │ Erro  │ Segurança │ Token JWT expirado…   │ req-y5z6a7b8       │
│▌08/09… │ Aviso │ API       │ Rate limit próximo…   │ req-q7r8s9t0       │
└──────────────────────────────────────────────────────────────────────────┘
  Mostrando 12 de N — scroll virtual sugerido
```

**Prós**

- Ideal para operadores: sort, busca, colunas claras
- Boa densidade com borda esquerda por nível (a11y: cor + texto)
- Padrão conhecido (CloudWatch, Datadog simplificado)

**Contras**

- Meta JSON exige coluna extra ou drawer (não mostrado na tabela base)
- Menos narrativa para incidentes correlacionados
- KPIs executivos exigem tela separada

---

## Padrão C — Timeline / Feed

```
    ●─── 2 min atrás  [Aviso]  req-e5f6g7h8
    │    Tentativa de login com credenciais inválidas
    │    [Ver detalhes]
    ●─── 3 min atrás  [Info]   req-e5f6g7h8
         POST /api/auth/sign-in — 401 Unauthorized
```

**Prós**

- Conta a história de um request (agrupamento por `requestId`/burst)
- Tempo relativo + absoluto no hover — bom para triagem
- Cards expansíveis com meta legível

**Contras**

- Baixa densidade; muito scroll em alto volume
- Sort multi-coluna menos natural que tabela
- Agrupamento heurístico pode confundir se mal calibrado

---

## Padrão D — Dashboard cards

```
┌ Erros(1h): 3 ┐ ┌ Avisos: 4 ┐ ┌ Info: 10 ┐
│ 📌 Erros críticos (fixados)                │
│   Falha SMTP · req-m3n4o5p6               │
▼ Segurança (4)  ▼ E-mail (2)  ▼ Sistema (3)  │
```

**Prós**

- Resumo executivo imediato (KPIs + erros pinados)
- Bom para Owner em overview diário
- Streams por categoria em accordion

**Contras**

- Detalhe fino e export exigem drill-down
- Não substitui explorador para investigação profunda
- Mais layout/CSS para manter

---

## Tabela comparativa

| Critério | A Terminal | B Tabela | C Timeline | D Dashboard |
|----------|------------|----------|------------|-------------|
| **Audiência principal** | Dev/SRE | Operador | Operador/incidente | Owner/executivo |
| **Densidade** | Alta | Alta | Média | Baixa–média |
| **Mobile** | Regular | Regular (scroll-x) | Boa (cards) | Boa |
| **A11y** | OK com badges+ícones | Forte (colunas+ borda) | Forte (tempo+ícones) | Forte (KPIs textuais) |
| **Correlação request** | Manual | Coluna Request ID | Nativa (grupos) | Por categoria |
| **Esforço implementação** | Baixo | Médio | Médio–alto | Médio–alto |
| **Meta JSON** | Inline collapse | Drawer sugerido | Card expand | Accordion item |

---

## Recomendação

**Padrão B (Tabela)** como base do log viewer no console Owner/Operator anxionOS, com **elementos emprestados de C e D**:

1. **Owner/Operator** precisam filtrar, ordenar e localizar `requestId` rapidamente — a tabela é o padrão mental de observabilidade institucional (CloudWatch, Datadog, Grafana Explore).
2. **Fintech institucional** exige auditabilidade: colunas explícitas (`Hora`, `Nível`, `Categoria`, `Mensagem`, `Request ID`) facilitam export e revisão de compliance.
3. **A11y:** borda esquerda por nível + badge textual + ícone de categoria atende WCAG (não depende só de cor).
4. **Roadmap:** adicionar drawer lateral (meta JSON) inspirado no Terminal; banner KPI + pin de erros críticos no topo inspirado no Dashboard; opcional modo Timeline para view de incidente por `requestId`.

O Terminal (A) permanece útil como **modo avançado** ou toggle para equipe de plataforma, não como default do Owner.

---

## Decisão do usuário

**Padrão escolhido:** **A + B + C + D (híbrido unificado)**

_Data da decisão:_ 2026-09-07

_Observações:_ O usuário optou por integrar os quatro padrões num único visualizador de produção, não apenas galeria comparativa.

### Implementação (ANX-37)

| Padrão | Componente | Papel no híbrido |
|--------|------------|------------------|
| **D — Dashboard** | `LogDashboardSummary` | Topo: KPIs por nível, taxa de erro, sparkline 5 min, breakdown por categoria |
| **B — Tabela** | `LogTable` | Vista principal: sort por coluna, `durationMs`, seleção de linha |
| **C — Timeline** | `LogTimelineStrip` | Faixa compacta com buckets de 1 min para burst detection |
| **A — Terminal** | `LogTerminalPanel` | Drawer inferior toggleável: stream monospace, auto-scroll, copiar linha |

**Rota de produção:** `/app/logs` (Owner Console, autenticado)

**Componentes compartilhados:** `frontend/src/components/logs/`

**Contratos:** `frontend/src/lib/logs/types.ts` (`LogEntry`, `logsResponseSchema`)

**Ingestão atual:** `GET /api/dev/logs` (ring buffer em memória, `ENABLE_DEV_ROUTES=true`) com fallback para mock local. Polling a cada 5s via `subscribeLogPoll`.

**Filtros:** nível, categoria, busca textual, período (5m / 15m / 1h / 24h / tudo)

---

## Referências

- Issue: ANX-26
- Mock data: `frontend/src/lib/log-mock-data.ts`
- Componentes galeria: `frontend/src/components/dev/log-patterns/`
- Componentes produção: `frontend/src/components/logs/`
- Design system: `frontend/design-system/MASTER.md`
