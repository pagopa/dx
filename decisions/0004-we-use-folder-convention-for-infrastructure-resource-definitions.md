# 1. We use folder convention for infrastructure resource definitions

Date: 2024-04-10

## Status

Accepted

## Context

Each monorepo holds the definition for infrastructure resources needed.

## Decision

The resource definitions will be placed into the `infra/resources` folder.
Definitions are intended to work for an environment in a specific region. Each pair environment/region is a Terraform project on its own and they will be located in the `<env>/<region>` subfolder.

Every automation will expect resources to be in such folders.

#### Example

```
infra/
├─ resource/
│  ├─ _modules/
│  │  ├─ azure-functions/
│  │  │   ├─ main.tf
│  │  │   ├─ outputs.tf
│  │  │   ├─ inputs.tf
│  │  ├─ resource-groups/
│  │  │   ├─ main.tf
│  │  │   ├─ outputs.tf
│  │  │   ├─ inputs.tf
│  ├─ dev/
│  │  ├─ westeurope/
│  │  │  ├─ main.tf
│  ├─ prod/
│  │  ├─ westeurope/
│  │  │  ├─ main.tf
│  │  ├─ northitaly/
│  │  │  ├─ main.tf
```

In the example above, we define different resource sets:

- production on west europe;
- production on north italy;
- development on west europe.

An hypothetical use case might be that the applications are served to users from west europe, using north italy for redundancy on production; on development environment there is no need to high availability thus only west europe resources are defined.

## Consequences

- Each environment can define a different set of resources. This will allow scenarios such as partial test environments.
- Applications that span over multiple regions require multiple Terraform projects
