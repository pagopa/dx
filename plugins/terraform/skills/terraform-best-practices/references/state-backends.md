# State Backends

Read this reference only when adding or changing a backend, changing state-access grants, or migrating state. For new environments in DX-compliant projects, prefer `dx add environment`.

## Naming

For new backends, use `<domain>-tf-state` for workspace state and `<prefix>-tf-state` for shared core state. Infer the domain from existing configuration or ask when unknown. Domains must be 3-15 lowercase alphanumeric or hyphen characters, with alphanumeric endpoints and no `--`; prefixes remain 2-4 characters.

Use `<layer>.tfstate` for direct roots or `<layer>/<relative-root-path>.tfstate` for nested roots. Preserve nested subproject paths; do not prepend domain, prefix, or lifecycle components.

- `infra/resources/ced-prod` uses `resources.tfstate`.
- `infra/resources/prod/ced` uses `resources/ced.tfstate`.

Exclude `_modules` and `modules` directories from application roots. These naming rules do not imply that scaffolding or discovery tools support every layout.

Before editing a backend, inspect `.tf` and `.tf.json`. Preserve existing coordinates and keys, including core backends using legacy `terraform-state`, unless migration is requested. Stop if coordinates cannot be resolved rather than falling back to the new convention.

## Azure Access

Use a Bootstrap version that exposes `terraform_state_container_access` and deploy its required core roles before opting in. `null` retains legacy grants; optional `container_name` defaults to `<environment.domain>-tf-state`. The optional `upstream` map defaults to empty; each key is an existing container name in the same account or its exact ARM container ID:

```hcl
terraform_state_container_access = {
  upstream = {
    "<existing-container-name-or-exact-ARM-container-ID>" = {
      identities    = toset(["infra_ci"])
      principal_ids = toset(["<external-principal-id>"])
    }
  }
}
```

In opt-in mode, Bootstrap grants own-container `Storage Blob Data Contributor` to its six identities (`infra_ci`, `infra_cd`, `app_ci`, `app_cd`, `opex_ci`, `opex_cd`) and upstream `Storage Blob Data Reader` only to declared recipients. IAM does not create containers or state snapshots.

- Keep the backend resource group separate from workload, additional, Opex, and private-networking resource groups.
- Before init, ensure the operator can write and lock newly managed domain and core containers; reuse sufficient inherited access and add Contributor only when needed.
- Preserve existing upstream core coordinates and grants. The first bootstrap plan reading upstream state needs Reader already available to its planning identity; arrange missing access manually and import or adopt existing grants before Terraform manages them. Do not add a CLI Reader grant or an automatic preliminary grant phase.
- Roots sharing a container share its access boundary. A `terraform_remote_state` reader can access the complete snapshot; check inherited, external, and key-based access before claiming isolation.

## Explicit Migration

Only migrate on request. Inspect backend coordinates and consumers, prepare destination and upstream access, suspend concurrent writes, and take a protected backup. Use `terraform init -migrate-state` when applicable, update consumers and pipelines in dependency order, and verify state, access, and plans before removing old grants. Preserve unrelated upstream state.

Splitting one state across roots is a separate operation; `terraform state mv` is not a substitute for backend migration.
