---
name: terraform-best-practices
description: Generates Terraform changes that follow PagoPA DX conventions. Use when creating or modifying Terraform resources, modules, or infrastructure architecture in this repository, especially to prefer pagopa-dx modules, infer values from existing infrastructure, validate generated code, and check the DX Technology Radar.
---

## Setup

Consider using subagents to parallelize the inspection of documentation, module source, and the technology radar.

If one of the `azure-keyvault-secret` or the `technology-radar` skills is not available, exit with an error message
indicating that the skill is required.

If the `~/.dx` directory does not exist, exit with an error message prompting the user to clone the `pagopa/dx` repository and try again.

Local KB includes:

- `~/.dx/apps/website/docs/terraform/` - DX Terraform best practices, including folder structure, code style, module usage, and more.
- `~/.dx/infra/modules/` — source code of all DX Terraform modules.
- `~/.dx/infra/modules/<module>/README.md` and `examples/` — documentation and examples for each DX module.
- `~/.dx/apps/website/docs/azure` — Azure-related documentation.

## Planning Phase

### 1. Start Inspecting the DX Knowledge Base

**Always read the DX Terraform documentation** before generating code.
All markdown sources within `~/.dx/apps/website/docs/terraform/` are the authoritative source for DX best practices.

**Always check the DX Technology Radar** before recommending any service or technology. Invoking the `technology-radar` skill is a critical step to ensure alignment with organizational standards and to avoid using deprecated or discouraged options.

### 2. Look for matching DX modules

**CRITICAL**: Before writing any Terraform `resource` block, check whether a `pagopa-dx/*` module already wraps that capability.
This applies to every resource: compute, storage, networking, IAM/RBAC role assignments, monitoring, and more.

For each resource you intend to create, start an explorer subagent to look for a matching module and gather its details:

1. List all the available DX modules under `infra/modules/`.
2. For each resource or service in scope, look for a matching module.
3. If a module exists:
   - inspect its source before using it
   - read `README.md`, `variables.tf`, `outputs.tf`, `main.tf`, supporting `.tf` files, and `examples/`
   - read `package.json` to determine the current version
   - pin the version as `~> major.minor`
   - use the module instead of raw resources
4. Use raw `azurerm_*` or `aws_*` resources only when no DX module covers the need.

#### Common modules you may overlook

The `pagopa-dx` namespace contains modules for many resource types beyond compute and storage. Examples of frequently missed modules include role assignments, service bus, event hub, CDN, API management, and container apps. **Always search — do not assume a module doesn't exist.**

#### Special case: sensitive values and secrets

Whenever the implementation involves managing sensitive values, secrets, or anything stored in Azure Key Vault, **stop and invoke the `azure-keyvault-secret` skill** before writing any code. It covers the correct and secure patterns for handling secrets in Terraform, including how to avoid storing sensitive data in state.

### 3. Discover Module Capabilities from Source, Not Just Summaries

For each relevant DX module, inspect the underlying Terraform source.

Use the module source to build a **capability map** that goes beyond the high-level descriptions in the `README.md`:

- available use cases
- top-level optional variables with defaults reveal major capabilities
- nested objects and lists reveal sub-capabilities
- `validation` blocks reveal constraints
- examples and implementation files show how a capability changes behavior

Do **not** rely on a hardcoded list of features for a module. Discover them dynamically from `variables.tf` and the module source.

### 4. Infer values from existing infrastructure before asking

#### Determine the target folder

Use `infra-folder-structure.md` to decide where the change belongs. Typical cases:

- ongoing environment resources: `infra/resources/<env>/`
- bootstrapping: `infra/bootstrapper/<env>/`

Only ask the user which folder to use when the docs do not make the location clear.

#### Inspect existing infrastructure

Look through existing `.tf` files in the target area to infer:

- `prefix`
- `env_short`
- `location`
- `domain`
- `app_name`
- `instance_number`
- resource group references
- subscription references
- existing `tags` values such as `BusinessUnit`, `ManagementTeam`, and `CostCenter`

#### Reuse shared outputs

If the workspace already uses a `pagopa-dx/<csp>-core-values-exporter/<provider>` module, prefer `module.<name>.<output>` references over new `data` sources for shared values such as:

- VNet IDs
- VNet resource groups
- private endpoint subnet IDs
- other exported platform values

#### Ask for unresolved values

**Only ask the user for values that could not be inferred from the steps above:**

- **Module use_case**: present all available `use_case` options with their descriptions (see step 5 below)
- `environment` values not already found: prefix, env_short, location, domain, app_name, instance_number
- `tags` values not already found: BusinessUnit, ManagementTeam
- Backend state configuration

### 5. Determine the Code Structure: Flat vs Local Module

After identifying the target folder, decide whether the new resources should live
inline in the env folder (`dev/`, `prod/`) or be extracted into a **local module**
under `infra/resources/_modules/<service-name>/`.

**Use a local module when:**

- You are creating **2 or more related resources for a single logical service** (e.g., an app
  - its CosmosDB + its storage account).
- The same group of resources might be reused across environments or will grow over time.

**Use inline resources when:**

- You are adding a single, standalone resource with no co-located siblings.
- You are patching an existing pattern that is already flat.

**If a local module is warranted:**

1.  Create `infra/resources/_modules/<service-name>/` with these files:
    - `main.tf` — DX registry module calls and `azurerm_*` resources not covered by DX modules
    - `variables.tf` — all inputs with `description` and `validation` blocks
    - `iam.tf` — all `module "..._role_assignments"` and any `azurerm_role_assignment` resources
    - `outputs.tf` — expose IDs, names, and endpoints that callers need
2.  Instantiate the local module from the env file (`infra/resources/<env>/main.tf` or (better) a
    dedicated `<service>.tf`) passing all required variables.
3.  **Never create `variables.tf` in root env folders** — configuration belongs in `locals.tf`
    (from `~/.dx/apps/website/docs/terraform/code-style.md`). Pass values to the local module via `locals`.

If the user has not indicated a preference, ask:

> "Should these resources be organized as a local module in `_modules/`?
> This is recommended when the service will grow or be reused across environments."

### 6. Ask One Question at a Time

**Never bundle multiple values into a single question.** Ask each unknown value in a separate, focused question. This reduces errors and makes it easier for the user to answer accurately.

**Wrong ❌**

> Please provide prefix, domain, app_name, and instance_number separated by commas.

**Right ✅**

> What is the `prefix` for this project? (e.g., `io`, `pagopa`, `dx`)
> What is the `domain`? (e.g., `wallet`, `payments`, `skl`)
> What is the `app_name`? (e.g., `storager`, `processor`)
> What `instance_number` should be used? (e.g., `01`, `02`)

**Offer choices whenever the set of valid values is known:**

- `env_short`: `p` (prod) / `d` (dev) / `u` (uat)
- `location`: `italynorth` / `westeurope` / `spaincentral`
- `BusinessUnit`: App IO / CGN / Carta della Cultura / IT Wallet / DevEx / Other (specify)
- `ManagementTeam`: IO Platform / IO Wallet / IO Comunicazione / IO Enti & Servizi / IO Autenticazione / IO Bonus & Pagamenti / IO Firma / Developer Experience / Other (specify)

Use free-form only for values with no fixed set (`prefix`, `domain`, `app_name`). Infer them from existing code if available before asking.

**For technical options such as module `use_case`**, always present a descriptive table so the user can make an informed choice. Fetch the available options from the module's documentation and format them like this example (Cosmos DB module):

| use_case      | Description                                                                                                                  | Zone Redundancy |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------- |
| `development` | Recommended for development or testing environments where cost efficiency and flexibility are key. Do not use in production. | Enabled         |
| `default`     | Suitable for production environments requiring predictable performance and provisioned throughput.                           | Disabled        |

Then ask: _"Which `use_case` best fits your needs?"_

#### Dynamic capability questions

Derive further user questions from the module capability map built from `variables.tf` (see step 4).

For each optional capability:

1. Explain **what it does** in plain language.
2. Explain the **default behavior** if the user leaves it unconfigured.
3. Explain **what changes** if the user enables it, disables it, or chooses a different value (behavior, security, scale, resilience, cost, operations).
4. Ask whether the user needs it.
5. If enabled, ask follow-up questions for sub-fields.

Examples of the kinds of capabilities this should catch dynamically include public vs private exposure, custom domains, Entra ID auth, Key Vault secret references, autoscaling, sizing, diagnostic settings, retention, private endpoints, or replica creation.

When the set of valid answers is known, offer choices instead of free-form input.

### 7. Never Assume Default Values

If project-specific configuration is not found in the workspace, ask the user.

### 8. Summarize Current and Planned State

Before writing or editing Terraform, briefly present to the user:

1. **Current state**: a concise summary of the existing infrastructure relevant to the request.
2. **Planned changes**: what will be added, modified, or removed, and why and how they relate to the Technology Radar.

Keep it focused on the affected resources and their direct dependencies — a full infrastructure inventory is not needed.
This summary ensures the user understands the impact before code is generated.

When describing changes, explain eventual exception to standard patterns, and the reason behind every non-obvious design choice.

## Execution Phase

### 1. Write Complete, Commented Terraform — No Skeletons, No Placeholders

**Always write complete, working code.** Never leave comments that merely instruct the user what to add later.

For **every non-obvious user-choosable parameter** in the generated IaC, add an inline comment, just above it, that explains:

1. **What the parameter controls**
2. **What changes if the value changes**

**Wrong ❌**

Avoid comments on parameters or code blocks that are obvious or self-explanatory:

```hcl
  # Changes the Node.js runtime version the web app executes with.
  node_version = 22
```

**Right ✅**

Explains use case choices and implications:

```hcl
  # Choose "development" for cost-effective, flexible environments. This disables performance optimizations but may have higher latency.
  # For predictable performance in production, choose "default" instead, which enables performance optimizations.
  use_case = "development"
```

### 2. Auto-wire Implicit Capabilities

Some capabilities should not be left to chance once the user has chosen a higher-level feature. Wire them automatically when needed:

- **Role assignments** when an identity needs data-plane or secret access
- **Managed identity** when services must read Key Vault or other protected resources
- **Private endpoints / private DNS wiring** when a private service pattern is selected
- **Write-only secret resources** for Key Vault-managed secrets
- **Required tags** according to DX conventions
- **Explicit dependencies** where Terraform ordering would otherwise be ambiguous
- **`dx_available_subnet_cidr` for every new subnet** — automatic CIDR allocation prevents overlaps and follows DX standards (required by `code-style.md`)

If a capability is automatically added, explain it briefly to the user so the generated topology stays understandable.

### 3. Validate and Fix Generated Code

After generating all files, **always run validation** in the target directory before presenting the code to the user:

1. Run `terraform init` to initialize providers and modules. If backend configuration is unavailable, run `terraform init -backend=false`.
2. Run `terraform validate` — fix **all** errors before proceeding.
3. Run `terraform plan` only if already authenticated; investigate and fix any errors reported.
4. **Iterate** until `validate` (and `plan` when applicable) pass with no errors.

Never present code to the user if `terraform validate` fails.

> For common errors and fixes, see [Terraform Troubleshooting](./references/troubleshooting.md).

## Review Phase

Refactor until all criteria in the [Terraform Best Practices Checklist](./references/checklist.md) are satisfied.

Produce a final report of the checklist with explanations for any items that are not fully met, and suggest next steps to address them.
