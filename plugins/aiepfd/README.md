# AIEPFD plugin

This plugin is enabled in the DX repository via `.github/copilot/settings.json`.

The plugin is currently empty and is created in this repository only so it can
be enabled and evolved in follow-up work.

To enable it in another repository, add `aiepfd@pagopa-dx` to that repository's
Copilot settings:

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
    "aiepfd@pagopa-dx": true
  }
}
```
