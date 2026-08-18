# Eval Scaffold Contract

Repository-dependent evals are composed from static, deterministic files:

- `azure-consumer-base/repository/` contains the minimal shared Azure consumer repository.
- `overlays/<name>/repository/` adds scenario-specific existing infrastructure or service context.

Every path below a `repository/` directory is copied to the same path in the disposable workspace. Scaffold layers must not provide the same target path; add a separate Terraform file instead of overriding base content.

Scaffolds must:

- contain no credentials, secret values, live subscription IDs, or user-specific paths
- use reserved or fictional identifiers
- expose every factual value the eval expects the agent to infer
- keep the target consumer repository separate from the read-only DX knowledge base
- avoid vendoring DX module source, so module discovery is still evaluated
- require no template rendering or network access

Run the shared `@pagopa/skill-evals:scaffold` Nx target documented in `evals/README.md` to materialize a fixture and initialize its Git baseline.
