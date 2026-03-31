---
name: generate-terraform-module-diagram
description: Generate a Mermaid flowchart diagram for a Terraform module with visible Azure and AWS provider icons. Use when asked to create, update, or visualize a Terraform module's infrastructure as a diagram. Creates a diagram.mmd file with cloud provider icons, converts it to diagram.svg with icons fully embedded, and adds a reference in the module's README.md.
---

# Terraform Module Diagram Generator

This skill analyzes a Terraform module and generates a Mermaid `flowchart LR` diagram with **fully embedded** Azure and AWS provider icons. It saves the diagram as `diagram.mmd`, converts it to `diagram.svg` (icons inlined, no external dependencies), and adds a reference in the module's `README.md`.

> **Icon approach**: diagrams use the `icon:` metadata syntax with two registered icon packs:
>
> - **Azure** → `Azure:icon-name` (from [NakayamaKento/AzureIcons](https://github.com/NakayamaKento/AzureIcons)) — 566 service-specific Azure icons
> - **AWS** → `logos:aws-icon-name` (from `@iconify-json/logos`) — 67 AWS service icons
>
> The render script passes both packs to `mmdc` via `--iconPacksNamesAndUrls` and `--iconPacks`, so icons are **inlined as SVG paths** in the output file — visible offline, in GitHub, in VS Code, everywhere.

## When to Use This Skill

- User asks to generate or update a diagram for a Terraform module
- User wants to visualize a Terraform module's infrastructure architecture
- User mentions "diagram", "visualize", or "architecture" in the context of a Terraform module

## Prerequisites

- Node.js ≥ 18 in PATH
- `mmdc` available globally, **or** `npx` available (downloads `@mermaid-js/mermaid-cli` on demand)
- Internet access at render time (to download the icon packs from CDN — one-time per run)

---

## Step 1: Analyze the Terraform Module

1. Read all `.tf` files in the module directory
2. Extract:
   - **Resources**: `resource "azurerm_*" / "aws_*" / "github_*"`
   - **Data sources**: `data "type" "name"`
   - **Module calls**: `module "name"`
3. Identify the cloud provider from resource prefixes:
   - `azurerm_*` → Azure
   - `aws_*` → AWS
   - `github_*` → GitHub (use Font Awesome icons)

---

## Step 2: Design the Mermaid Diagram

### Diagram Type

Use **`flowchart LR`** (Left-Right) for modules with 5+ resources. Use `flowchart TD` for simple, linear pipelines.

> **Why not `architecture-beta`?** `flowchart LR` with `icon:` metadata produces equivalent visual output and is more widely supported. `architecture-beta` requires additional setup and its edge syntax is less expressive for representing Terraform resource dependencies.

### Icon Syntax

Add icons to flowchart nodes using the `@{ icon: ... }` metadata:

```
nodeId["Node Label"]
nodeId@{ icon: "PackPrefix:icon-name" }
```

**Azure pack prefix**: `Azure` (capital A) — e.g., `Azure:virtual-networks`
**AWS pack prefix**: `logos` — e.g., `logos:aws-lambda`

### Azure Icon Reference

| Resource                   | Icon name                           |
| -------------------------- | ----------------------------------- |
| Resource Group             | `Azure:resource-groups`             |
| Virtual Network            | `Azure:virtual-networks`            |
| Key Vault                  | `Azure:key-vaults`                  |
| Storage Account            | `Azure:storage-accounts`            |
| Function App               | `Azure:function-apps`               |
| App Service                | `Azure:app-services`                |
| App Service Plan           | `Azure:app-service-plans`           |
| Container App              | `Azure:container-apps`              |
| Container Apps Environment | `Azure:container-apps-environments` |
| API Management             | `Azure:api-management-services`     |
| Application Insights       | `Azure:application-insights`        |
| Log Analytics Workspace    | `Azure:log-analytics-workspaces`    |
| Managed Identity           | `Azure:managed-identities`          |
| Service Bus                | `Azure:service-bus`                 |
| Event Hub                  | `Azure:event-hubs`                  |
| SQL Database               | `Azure:sql-database`                |
| Cosmos DB                  | `Azure:cosmos-db`                   |
| AKS                        | `Azure:kubernetes-services`         |
| Private Endpoint           | `Azure:private-endpoints`           |
| Private DNS Zone           | `Azure:private-dns-zones`           |

> Full icon list (566 icons): https://github.com/NakayamaKento/AzureIcons

### AWS Icon Reference

| Resource        | Icon name                   |
| --------------- | --------------------------- |
| Lambda          | `logos:aws-lambda`          |
| EC2             | `logos:aws-ec2`             |
| S3              | `logos:aws-s3`              |
| RDS             | `logos:aws-rds`             |
| VPC             | `logos:aws-vpc`             |
| IAM             | `logos:aws-iam`             |
| CloudFront      | `logos:aws-cloudfront`      |
| CloudWatch      | `logos:aws-cloudwatch`      |
| DynamoDB        | `logos:aws-dynamodb`        |
| ECS             | `logos:aws-ecs`             |
| EKS             | `logos:aws-eks`             |
| API Gateway     | `logos:aws-api-gateway`     |
| SQS             | `logos:aws-sqs`             |
| SNS             | `logos:aws-sns`             |
| Secrets Manager | `logos:aws-secrets-manager` |
| CloudFormation  | `logos:aws-cloudformation`  |
| EventBridge     | `logos:aws-eventbridge`     |

> Full icon list: https://icon-sets.iconify.design/logos/ (filter by `aws-`)

### Subgraph Structure

Group resources into semantic layers using subgraphs:

```
flowchart LR
    subgraph Network["Network Layer"]
        vnet["Virtual Network"]
        vnet@{ icon: "Azure:virtual-networks"}
        subnet["Subnet"]
    end

    subgraph Compute["Compute Layer"]
        func["Function App"]
        func@{ icon: "Azure:function-apps"}
    end

    Network --> Compute
```

**Layering logic:**

| Subgraph Name           | Resource Types                                            |
| ----------------------- | --------------------------------------------------------- |
| **Network**             | VNets, Subnets, NSGs, DNS, Private Endpoints              |
| **Compute**             | VMs, Function Apps, AKS, App Services, Lambda, ECS        |
| **Storage / Data**      | Storage Accounts, SQL DBs, Key Vaults, Cosmos DB, S3, RDS |
| **Identity / Security** | Managed Identities, IAM Roles                             |
| **Monitoring**          | App Insights, Log Analytics, CloudWatch                   |

### Design Principles

- Use `flowchart LR` for 5+ resources; `flowchart TD` for simple pipelines
- **Limit arrows**: 1–2 per resource; aim for 5–10 arrows total. Connect subgraphs to subgraphs, not individual nodes
- `-->` for required dependencies, `-.->` for optional ones
- **NEVER apply `classDef` with `fill:` to icon nodes** — it hides the icon. Border-only styling is OK:
  ```
  classDef important stroke:#E81123,stroke-width:3px
  class vnet important
  ```
- Do NOT add "Module Inputs" / "Module Outputs" nodes — show actual infrastructure only
- For modules with 15+ resources, group minor resources (e.g., NICs/disks implied by the VM node)

---

## Step 3: Save `diagram.mmd`

Write the Mermaid code (**no markdown fences**, no triple backticks) to `{module_path}/diagram.mmd`.

**Example** for an Azure Function App module:

```
flowchart LR
    subgraph Network["Network Layer"]
        vnet["Virtual Network"]
        vnet@{ icon: "Azure:virtual-networks"}
        subnet["Subnet"]
    end

    subgraph Compute["Compute Layer"]
        asp["App Service Plan"]
        asp@{ icon: "Azure:app-service-plans"}

        func["Function App"]
        func@{ icon: "Azure:function-apps"}
    end

    subgraph Secrets["Secrets & Storage"]
        kv["Key Vault"]
        kv@{ icon: "Azure:key-vaults"}

        st["Storage Account"]
        st@{ icon: "Azure:storage-accounts"}
    end

    subgraph Monitoring["Monitoring"]
        ai["App Insights"]
        ai@{ icon: "Azure:application-insights"}

        law["Log Analytics"]
        law@{ icon: "Azure:log-analytics-workspaces"}
    end

    Network --> Compute
    Compute --> Secrets
    Monitoring -.-> Compute
```

---

## Step 4: Convert `diagram.mmd` → `diagram.svg`

Run the render script included in this skill:

```bash
node .github/skills/generate-terraform-module-diagram/scripts/render-svg.mjs {module_path}/diagram.mmd
```

This produces `{module_path}/diagram.svg` with icons **fully inlined** as SVG paths — no external references needed.

**Direct mmdc command** (equivalent, if you prefer to run it manually):

```bash
mmdc \
  -i {module_path}/diagram.mmd \
  -o {module_path}/diagram.svg \
  -t dark -b transparent \
  --iconPacksNamesAndUrls "Azure#https://raw.githubusercontent.com/NakayamaKento/AzureIcons/refs/heads/main/icons.json" \
  --iconPacks @iconify-json/logos
```

**If a Mermaid MCP server is configured** in your environment (e.g., `mcp-mermaid`, `mermaid-svg-mcp`), you may use it as an alternative. Ensure it supports the `--iconPacksNamesAndUrls` option or equivalent icon registration; otherwise, icons will appear as grey placeholders.

> **Troubleshooting**: If icons show as empty squares, verify the icon name exists in the pack. Check Azure icons at https://github.com/NakayamaKento/AzureIcons and AWS icons at https://icon-sets.iconify.design/logos/

---

## Step 5: Update `README.md`

1. Read the current `README.md` in the module directory
2. Find the `## Diagram` section or the `<!-- BEGIN_TF_DOCS -->` marker

**If `## Diagram` already exists**: replace its entire content with the image reference.

**If `## Diagram` does not exist**: insert the complete section immediately before `<!-- BEGIN_TF_DOCS -->`.

Use this exact format:

```markdown
## Diagram

![diagram](./diagram.svg)
```

**Visual structure of README**:

```
# Module Title
... (Features, Usage, etc.) ...

## Diagram               ← last manual section

![diagram](./diagram.svg)

<!-- BEGIN_TF_DOCS -->   ← auto-generated content starts here
```

Rules:

- Heading is exactly `## Diagram`
- Content is only `![diagram](./diagram.svg)` — no legend, no extra text
- Never place the section after `<!-- BEGIN_TF_DOCS -->`

---

## Completion Summary

After all steps succeed, report:

- List of main resources included in the diagram
- ✅ `diagram.mmd` created/updated — full path
- ✅ `diagram.svg` generated — full path and file size
- ✅ `README.md` updated — full path
- Any issues encountered (e.g., unknown icon names, render errors)
