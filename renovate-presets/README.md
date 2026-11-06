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

The preset currently enables and groups major updates for Terraform modules
published under the `pagopa-dx/` namespace, including when inherited configuration
disables major updates. It does not enable other update types or namespaces.
Additional DX-managed rules can be added to this preset without changing the
reference in consumer repositories.
