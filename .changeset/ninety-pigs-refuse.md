---
"filter-terraform-plan": patch
---

Fix, now the sensitive-key passed as input checks whether the value is contained in the key; it no longer performs an exact match.
