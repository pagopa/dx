# PADEF plugin

PADEF (PagoPA Agentic Delivery Framework) is the PagoPA plugin for AI-enabled
product development workflows. It bundles the skills that carry an initiative
from a PRD to a design review, its use cases, and the Jira backlog.

The plugin was previously published as `aiepdf@pagopa-dx` and then as
`paf@pagopa-dx`. Replace the old entry in `enabledPlugins` with
`padef@pagopa-dx` to keep it enabled.

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
