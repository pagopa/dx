# AIEPFD plugin

This plugin is enabled in the DX repository via `.github/copilot/settings.json`.

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
