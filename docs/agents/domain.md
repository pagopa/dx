# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the
codebase.

This repo is **multi-context**: `apps/`, `packages/`, `infra/modules/`, `providers/`, and
`actions/` each own a slice of the domain, and a glossary may be scoped to any of them.

## Before exploring, read these

- **`GLOSSARY-MAP.md`** at the repo root: it maps each context path to its `GLOSSARY.md`. Read
  every glossary relevant to the topic before you start.
- **`docs/adr/`**: system-wide decisions that cut across contexts.
- **`<context>/docs/adr/`**: context-scoped decisions, e.g. `apps/dx-metrics/docs/adr/`.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't
suggest creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and
`/improve-codebase-architecture`) creates them lazily when terms or decisions actually get
resolved.

## File structure

```
/
├── GLOSSARY-MAP.md                    ← index: context path → GLOSSARY.md
├── docs/adr/                          ← system-wide decisions
├── apps/website/
│   ├── GLOSSARY.md
│   └── docs/adr/                      ← context-specific decisions
├── packages/nx-terraform-plugin/
│   ├── GLOSSARY.md
│   └── docs/adr/
└── infra/modules/aws_lambda/
    ├── GLOSSARY.md
    └── docs/adr/
```

A context only needs a glossary or ADR directory once it has terms or decisions worth
recording; do not scaffold them speculatively. Add a newly-created glossary to
`GLOSSARY-MAP.md` at the same time.

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis,
a test name), use the term as defined in the relevant `GLOSSARY.md`. Don't drift to synonyms
the glossary explicitly avoids.

If the concept you need isn't in a glossary yet, that's a signal: either you're inventing
language the project doesn't use (reconsider) or there's a real gap (note it for
`/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently
overriding:

> _Contradicts ADR-0007 (event-sourced orders), but worth reopening because…_
