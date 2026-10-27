# PAF plugin

PAF (PagoPA Agentic Framework) is the PagoPA plugin for AI-enabled product
development workflows. It bundles the skills that carry an initiative from a
PRD to a design review, its use cases, and the Jira backlog.

The plugin was previously published as `aiepdf@pagopa-dx`. Replace the old
entry in `enabledPlugins` with `paf@pagopa-dx` to keep it enabled.

To enable the plugin in another repository, add `paf@pagopa-dx` to that
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
    "paf@pagopa-dx": true
  }
}
```
