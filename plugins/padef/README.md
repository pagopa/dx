# PADEF plugin

PADEF (PagoPA Agentic Delivery Framework) is the PagoPA plugin for AI-enabled
product development workflows. It bundles the skills that carry an initiative
from a PRD to a design review, its use cases, and the Jira backlog.

Use [`assess-jira-implementation-readiness`](./skills/assess-jira-implementation-readiness/SKILL.md)
to check whether an existing Jira issue is eligible for implementation. This
read-only gate checks metadata, blockers, and required description sections; it
is separate from upstream requirements readiness.

Use [`create-spec-snapshot`](./skills/create-spec-snapshot/SKILL.md) with a Jira
issue key, numeric ID, or URL to cache selected fields and its description as
`issue.json`, plus each Confluence page linked from the description once as
`confluence-{page-id}.md`, in `$XDG_CACHE_HOME/padef/snapshots/{jira-issue-id}/`
(default `~/.cache/padef/snapshots/{jira-issue-id}/`). Each run fetches the
issue anew; if a saved snapshot is stale or tampered, the skill asks before
replacing the whole folder. Jira and Confluence stay unchanged.
Read-only files and a `SHA256SUMS` covering every file in the folder detect
accidental edits, additions, and removals; they do not stop deliberate
tampering. `verify-snapshot.js <ISSUE-KEY>` checks them, and given fresh Jira
and Confluence responses it also reports whether the snapshot is stale.

To enable the plugin in another repository, add `padef@pagopa-dx` to that
repository's Copilot settings:

```json
{
  "extraKnownMarketplaces": {
    "pagopa-dx": {
      "source": {
        "source": "github",
        "repo": "pagopa/dx"
      }
    }
  },
  "enabledPlugins": {
    "padef@pagopa-dx": true
  }
}
```
