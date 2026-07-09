# AIEPFD plugin

To enable the plugin in another repository, add `aiepfd@pagopa-dx` to that repository's
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
