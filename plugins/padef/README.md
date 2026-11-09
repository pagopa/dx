# PADEF plugin

PADEF (PagoPA Agentic Delivery Framework) is the PagoPA plugin for AI-enabled
product development workflows. It bundles the skills that carry an initiative
from a PRD to a design review, its use cases, and the Jira backlog.

Use [`assess-jira-issue-readiness`](./skills/assess-jira-issue-readiness/SKILL.md)
to check whether an existing Jira issue is eligible for implementation. This
read-only gate checks metadata, blockers, and required description sections; it
is separate from upstream requirements readiness.

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
