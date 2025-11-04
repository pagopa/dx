# filter-terraform-plan

## 0.0.2

### Patch Changes

- 8569641: Fix, now the sensitive-key passed as input checks whether the value is contained in the key; it no longer performs an exact match.

## 0.0.1

### Patch Changes

- c293615: First release of the GitHub Action: runs terraform plan, masks sensitive values, and removes unnecessary lines to reduce the final output size.
