# Bootstrapper migrations

## GitHub provider source

The bootstrapper now uses `integrations/github` instead of `hashicorp/github`.
Before planning or applying the updated configuration, migrate each existing
environment state (`dev`, `uat`, and `prod`) once. From the repository root,
initialize that environment with its Nx target, then replace the provider
source in its state:

```sh
pnpm nx run bootstrapper-dev:init
mise exec -- terraform -chdir=infra/bootstrapper/dev state replace-provider \
  registry.terraform.io/hashicorp/github \
  registry.terraform.io/integrations/github

pnpm nx run bootstrapper-uat:init
mise exec -- terraform -chdir=infra/bootstrapper/uat state replace-provider \
  registry.terraform.io/hashicorp/github \
  registry.terraform.io/integrations/github

pnpm nx run bootstrapper-prod:init
mise exec -- terraform -chdir=infra/bootstrapper/prod state replace-provider \
  registry.terraform.io/hashicorp/github \
  registry.terraform.io/integrations/github
```

Terraform asks for confirmation for each state. The command updates the
provider source recorded in that environment's state; it does not modify the
GitHub resources. Review a normal plan for each environment before applying.
