# Repository visibility is scoped by static tags and signed, stateless magic links

Status: accepted

The portal used to show the whole portfolio to every visitor the Azure Container
App had already authenticated with Entra ID. Teams now need to show only their
own repositories. We attach static tags to the configured repositories, and a
visitor's scope is the union of the repositories carrying the tags of the magic
link they opened. The link carries its tags in a base64url payload followed by
an HMAC-SHA256 of that payload keyed with a secret held in Key Vault, so a scope
can be verified without a session store, a schema change, or any row written to
the database. The token is deterministic: the same tag set always produces the
same link, and editing a tag changes what every existing link sees.

## Considered options

- **Prefix or regex matching on repository names.** Rejected: the grouping is a
  team's ownership, not a naming accident, and `pnpm-*`-style prefixes drift the
  moment a repository is renamed. Tags also make the grouping reviewable in a
  diff.
- **The link carries the resolved repository list.** Rejected: every added
  repository would orphan every link already in circulation. Carrying tags keeps
  the link a reference to a group rather than a frozen copy of its contents.
- **Opaque per-scope tokens stored in configuration.** Rejected: the token would
  not be derivable, so support cannot regenerate a lost link, and every new
  scope means a config change plus a redistribution.
- **Scopes in PostgreSQL.** Rejected: it is the one thing the deployment does
  not need — a table, a migration and a write path for data that already lives
  in version control.

## Consequences

- The signing secret is the real credential: whoever holds
  `DX_METRICS_SCOPE_SECRET` can mint a link for any scope, including the full
  portfolio. It lives in Key Vault and is injected as an environment variable.
- Revoking a single link is impossible. Revocation is rotating the secret, which
  invalidates every link in circulation; a per-scope secret would be needed to
  do better, and there is no personal identity behind a link to revoke anyway.
- Dashboard responses can no longer be cached publicly. A shared cache would
  serve one scope's payload to another visitor, so `Cache-Control` becomes
  `private, no-store` and the client-side cache stays the only one.
- Repositories are no longer a flat string list in `DxMetricsConfig`, and the
  dashboards that ignore repository selection today (DX Team, Benchmark,
  Techradar, Tracker, Releases) each need an explicit visibility decision.
