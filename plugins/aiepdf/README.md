# AIEPDF plugin

To enable the plugin in another repository, add `aiepdf@pagopa-dx` to that repository's
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
    "aiepdf@pagopa-dx": true
  }
}
```
