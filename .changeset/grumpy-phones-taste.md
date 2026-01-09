---
"provider-azure": patch
---

Add a new check for the `domain` in the naming convention: it must never be identical to the `name`.
Also add a control that detects when the name matches the first part of the resource abbreviation and removes the duplicate.
For example, if `name = kv` for a `key_vault` resource, the final name will not be
`[prefix]-[environment]-[location]-kv-kv-[instance number]`
but instead
`[prefix]-[environment]-[location]-kv-[instance number]`
