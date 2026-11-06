# Renovate presets

Use the shared PagoPA DX preset in a repository's `renovate.json`:

```json
{
  "extends": [
    "config:recommended",
    "github>pagopa/dx//renovate-presets/default"
  ]
}
```

The preset currently groups major updates for Terraform modules published under
the `pagopa-dx/` namespace. Additional DX-managed rules can be added to this preset
without changing the reference in consumer repositories.
