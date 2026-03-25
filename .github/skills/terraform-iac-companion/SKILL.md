---
name: terraform-iac-companion
description: >-
  Guides developers through writing Terraform infrastructure-as-code using PagoPA DX modules.
  USE WHEN the user asks to add, modify, or review Azure infrastructure (Container Apps, PostgreSQL,
  Key Vault, Function Apps, Storage, Cosmos DB, CDN, Service Bus, Event Hub). Also use when the user
  asks to generate health checks, verify deployed infrastructure, create IaC from scratch, or
  understand which DX modules to use. Produces ASCII diagrams, IaC code, and Azure CLI verification
  scripts.
---

# Terraform IaC Companion

An interactive coding agent that helps developers write correct, production-ready Terraform
configurations using PagoPA DX modules — and generates Azure CLI health-check scripts to verify
that the deployed infrastructure actually works.

## When to Use This Skill

- Developer wants to **add or modify Azure infrastructure** (Container Apps, databases, storage, etc.)
- Developer asks **"which module should I use?"** or **"how do I configure X?"**
- Developer wants to **verify their infrastructure works** after `terraform apply`
- Developer needs to **understand the current state** of their IaC

## Prerequisites

- Terraform >= 1.11.0
- Azure CLI (`az`) installed and authenticated
- **Terraform MCP server** available (for querying the Terraform Registry)
- GitHub MCP tools available (for reading module source code from `pagopa/dx`)

## Workflow

Follow these steps in order. Each step references detailed documentation in the `reference/` folder.

### Step 1: Explore the User's Current Infrastructure

Scan the user's repository for existing Terraform configurations.

1. Look for `.tf` files in these common locations: `infra/`, `terraform/`, `infrastructure/`, or the repo root
2. Identify which DX modules are already in use (search for `source = "pagopa-dx/`)
3. Map existing resources: resource groups, networking, identity, data stores, compute
4. Check the environment structure: look for `dev/`, `prod/`, `uat/` directories or workspace configurations

Produce an **ASCII diagram** of the current infrastructure:

```
┌─────────────────────────────────────────────────────────┐
│ Resource Group: rg-dx-p-itn-common-01                   │
│                                                         │
│  ┌──────────────┐    ┌──────────────┐                   │
│  │ Container App│───▶│  Key Vault   │                   │
│  │  Environment │    │  (secrets)   │                   │
│  │              │    └──────────────┘                   │
│  │ ┌──────────┐ │           │                           │
│  │ │ app-ca   │ │           │ read secrets              │
│  │ └──────────┘ │    ┌──────▼──────┐                    │
│  └──────────────┘    │ PostgreSQL  │                    │
│                      │ (private EP)│                    │
│                      └─────────────┘                    │
└─────────────────────────────────────────────────────────┘
```

### Step 2: Discover Available DX Modules

Explore the PagoPA DX modules available on the **Terraform Registry** and in the
**pagopa/dx GitHub repository**. This step determines what building blocks exist and
what capabilities they expose.

#### 2a. Search the Terraform Registry

Use the **Terraform MCP server** tools to discover modules:

1. `search_modules` with query `"pagopa-dx"` — lists all published DX modules
2. For each relevant module, call `get_module_details` with the `module_id` — returns
   full documentation including inputs, outputs, dependencies, and usage examples

This gives you the **public interface** of each module: what it accepts and what it produces.

#### 2b. Read Module Source from GitHub

For deeper understanding, read module internals from the `pagopa/dx` repository
using GitHub MCP tools (`get_file_contents` with `owner: "pagopa"`, `repo: "dx"`):

| File | Path | What you learn |
|---|---|---|
| README.md | `infra/modules/<module_name>/README.md` | Features, use cases, setup guides |
| variables.tf | `infra/modules/<module_name>/variables.tf` | **All capabilities** — each variable with `validation` blocks reveals what the module can do and what constraints it enforces |
| outputs.tf | `infra/modules/<module_name>/outputs.tf` | What the module exposes for downstream consumption |
| examples/ | `infra/modules/<module_name>/examples/` | Real-world configurations — the best starting points for user code |
| CHANGELOG.md | `infra/modules/<module_name>/CHANGELOG.md` | Latest version, breaking changes, new features |

See [module-discovery.md](./reference/module-discovery.md) for the mapping between module
directory names and their registry identifiers.

#### 2c. Extract Capabilities from Module Variables

This is the key step. Parse each module's `variables.tf` to build a **capability map**.
Each variable (or group of variables) represents a capability the developer can enable.

Example — reading `azure_container_app/variables.tf` yields these capabilities:

| Variable(s) | Capability | What it does |
|---|---|---|
| `public_access_enabled` | **Public ingress** | Expose app to internet |
| `custom_domain`, `custom_domain.dns` | **Custom domain** | Bind a domain with managed SSL |
| `authentication.azure_active_directory` | **Entra ID auth** | EasyAuth login for users |
| `secrets` | **Key Vault integration** | Read secrets at runtime |
| `autoscaler` | **Autoscaling** | Scale on HTTP, queues, or custom rules |
| `size` | **Resource sizing** | CPU/memory allocation |
| `diagnostic_settings` | **Monitoring** | Send logs to Log Analytics |
| `container_app_templates[].liveness_probe` | **Health probes** | Liveness, readiness, startup checks |

**Do NOT hardcode this list.** Discover it dynamically by reading `variables.tf` for
whichever modules the user needs. Different modules expose different capabilities.

Also check the DX documentation site for best practices:
- [Terraform folder structure](https://dx.pagopa.it/docs/terraform/infra-folder-structure)
- [Using Terraform Registry modules](https://dx.pagopa.it/docs/terraform/using-terraform-registry-modules)
- [Azure IAM patterns](https://dx.pagopa.it/docs/azure/iam/azure-iam)
- [Azure networking](https://dx.pagopa.it/docs/azure/networking/)

### Step 3: Interactive Capability Checklist

Ask the user questions to determine **which capabilities to enable**. The questions come
from two sources:

#### 3a. Fixed Core Questions (always ask these)

These determine which modules to use:

1. **What type of application?** (Web app / API / Background worker / Static site)
2. **Which compute platform?** (Container App / App Service / Function App) — guide the user if unsure
3. **Which environment?** (dev / uat / prod) — affects sizing, HA, and security defaults
4. **Does it need a database?** (PostgreSQL / Cosmos DB / None)

#### 3b. Dynamic Capability Questions (derived from Step 2c)

After identifying the relevant modules, generate questions from their capability maps.
See [checklist-questions.md](./reference/checklist-questions.md) for the question
generation pattern and examples.

For each capability discovered in `variables.tf`:

1. **Explain** what the capability does and when it's useful (use the variable's
   `description` and the module README for context)
2. **Ask** whether the user needs it
3. **If yes**, ask follow-up questions for the capability's sub-options (e.g., if
   `custom_domain` is enabled → ask for the hostname and DNS zone)

**Example dynamic flow** for `azure_container_app`:

```
Agent: "The Container App module supports these capabilities:"
       "1. Public access (internet-facing) or private (VNet-only)"
       "2. Custom domain with managed SSL certificate"
       "3. Entra ID authentication (EasyAuth)"
       "4. Key Vault secret references"
       "5. Autoscaling (HTTP, queue-based, or custom KEDA scalers)"
       "6. Diagnostic settings (Log Analytics)"
       "Which of these do you need?"

User:  "1, 2, 4"

Agent: "For custom domain: what hostname? (e.g., api.myapp.pagopa.it)"
       "Which DNS zone? (e.g., myapp.pagopa.it)"
...
```

The key principle: **the agent discovers capabilities from the module, not from a
static list.** If a module adds a new variable in a future version, the agent
will automatically pick it up.

### Step 4: Plan Changes

Produce a **diff diagram** showing what will be added or changed:

```
┌─────────────────────────────────────────────────────────┐
│ Resource Group: rg-dx-p-itn-common-01                   │
│                                                         │
│  ┌──────────────┐    ┌──────────────┐                   │
│  │ Container App│───▶│  Key Vault   │                   │
│  │  Environment │    │  (secrets)   │                   │
│  │              │    └──────────────┘                   │
│  │ ┌──────────┐ │           │                           │
│  │ │ app-ca   │ │           │ read secrets              │
│  │ └──────────┘ │    ┌──────▼──────┐                    │
│  │ ┌──────────┐ │    │ PostgreSQL  │ ◀── + private EP   │
│  │ │+ NEW-CA  │ │    │ (private EP)│                    │
│  │ └──────────┘ │    └─────────────┘                    │
│  └──────────────┘           │                           │
│         │              + role assignment                 │
│         ▼                   │                           │
│  + ┌──────────────┐  + ┌───▼──────────┐                │
│    │ Custom Domain│    │ Role Assign  │                  │
│    │ CNAME + cert │    │ KV → new-ca  │                  │
│    └──────────────┘    └──────────────┘                  │
└─────────────────────────────────────────────────────────┘
  + = new resources
```

Then generate the Terraform code following these conventions:
- Use `pagopa-dx/*` registry modules (never raw `azurerm_` resources when a module exists)
- Before generating new IaC, always verify the latest available version of each DX module via
  the Terraform Registry MCP (`get_module_details`) and make sure the produced code uses that
  latest version
- Pin versions with `~>` operator (e.g., `version = "~> 4.2"`) after confirming the latest
  published version
- Use `write-only` attributes for secrets (Terraform >= 1.11)
- Follow the [environment object pattern](#environment-pattern) consistently
- Use `pagopa-dx/azure-role-assignments/azurerm` for all IAM grants
- Add `depends_on` when there are implicit ordering requirements (e.g., role assignments before app start)
- Reference the closest `examples/` from Step 2b as the starting template
- Add concise inline comments for module input values that may be non-obvious to the user or
  that required a design choice/tradeoff (for example sizing, networking exposure, retention,
  replica counts, or optional features enabled/disabled). Do **not** comment every variable:
  document only the values whose rationale would otherwise be unclear.

### Step 5: Generate Health Check Script

After the IaC code is ready, generate an Azure CLI health check script that verifies the
deployed infrastructure actually works. See [healthcheck-patterns.md](./reference/healthcheck-patterns.md)
for all available verification patterns.

**Only include checks for capabilities the user actually enabled.** The patterns are
organized by capability so you can pick exactly the right ones.

The script should be:
- **Self-contained**: runs with just `az` CLI (no extra dependencies)
- **Idempotent**: safe to run multiple times
- **Informative**: clear pass/fail output with actionable error messages
- **Scoped**: only checks what the IaC deploys

Use the [healthcheck template](./templates/healthcheck.sh) as a starting point,
uncommenting and configuring only the relevant sections.

## Environment Pattern

All DX modules use a consistent environment object for naming:

```hcl
environment = {
  prefix          = "dx"          # Organization/solution prefix
  env_short       = "d"           # d = dev, u = uat, p = prod
  location        = "italynorth"  # Azure region
  domain          = "myapp"       # Business domain (optional)
  app_name        = "api"         # Application name
  instance_number = "01"          # Instance number
}
```

**Mapping `env_short` to environment:**

| Environment | `env_short` | Typical differences |
|---|---|---|
| dev | `d` | Smaller SKUs, no replicas, relaxed networking |
| uat | `u` | Production-like, may skip HA |
| prod | `p` | Full HA, replicas, strict networking, alerts enabled |

## Reference Documentation

- [Module Discovery](./reference/module-discovery.md) — how to find and inspect DX modules
- [Checklist Questions](./reference/checklist-questions.md) — fixed + dynamic question patterns
- [Health Check Patterns](./reference/healthcheck-patterns.md) — Azure CLI verification commands
- [Health Check Template](./templates/healthcheck.sh) — base script template
