# Renovate presets

Use the PagoPA DX Terraform module preset in a repository's `renovate.json`:

```json
{
  "extends": [
    "config:recommended",
    "github>pagopa/dx//renovate-presets/pagopa-dx-terraform-modules"
  ]
}
```

The preset groups major updates for Terraform modules published under the
`pagopa-dx/` namespace.
