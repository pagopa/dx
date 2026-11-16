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
`confluence-{page-id}.md`, in an immutable generation under
`$XDG_CACHE_HOME/padef/snapshots/{jira-issue-id}/` (default
`~/.cache/padef/snapshots/{jira-issue-id}/`). The `CURRENT` pointer selects the
latest generation, and prior generations remain available to concurrent
readers. Each run fetches the issue anew; if a saved snapshot is stale or
tampered, the skill asks before replacing it. Jira and Confluence stay
unchanged.
Each generation's read-only files and `SHA256SUMS` detect accidental edits,
additions, and removals; they do not stop deliberate tampering.
`verify-snapshot.js <ISSUE-KEY>` checks the current generation, and given fresh
Jira and Confluence responses it also reports whether the snapshot is stale.

Select the [`Implementer`](./com.github.copilot/agents/implementer.agent.md)
agent with a Jira issue key or URL to implement that issue. It stops unless
`assess-jira-implementation-readiness` reports the issue `Ready`, then assigns
the issue to you and moves it to `In Progress`. It reads requirements from the
`create-spec-snapshot` snapshot first and live only for linked resources the
snapshot lacks, works test-first with the `tdd` skill when available (otherwise
a plain red-green loop), and finishes with a code review and a security review
of the change.

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
