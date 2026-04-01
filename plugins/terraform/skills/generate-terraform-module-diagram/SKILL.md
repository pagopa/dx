---
name: generate-terraform-module-diagram
description: Generate a Mermaid flowchart diagram for a Terraform module with visible Azure and AWS provider icons. Use when asked to create, update, or visualize a Terraform module's infrastructure as a diagram. Creates a diagram.mmd file with cloud provider icons, converts it to diagram.svg with icons fully embedded, and adds a reference in the module's README.md.
---

# Terraform Module Diagram Generator

This skill analyzes a Terraform module and generates a Mermaid `flowchart LR` diagram with **fully embedded** Azure and AWS provider icons. It saves the diagram as `diagram.mmd`, validates the syntax, converts it to `diagram.svg` (icons inlined as SVG paths — no external dependencies), and adds a reference in the module's `README.md`.

> **Icon packs used** — both loaded from public CDN at render time:
>
> | Provider | Syntax in `.mmd`      | Pack source                                                                                 |
> | -------- | --------------------- | ------------------------------------------------------------------------------------------- |
> | Azure    | `azure:icon-name`     | [NakayamaKento/AzureIcons](https://github.com/NakayamaKento/AzureIcons) — 566 service icons |
> | AWS      | `logos:aws-icon-name` | `@iconify-json/logos` — 67 AWS service icons                                                |

## When to Use This Skill

- User asks to generate or update a diagram for a Terraform module
- User wants to visualize a Terraform module's infrastructure architecture
- User mentions "diagram", "visualize", or "architecture" in the context of a Terraform module

## Prerequisites

- Node.js >= 18 in PATH
- `mmdc` available globally, **or** `npx` available (downloads `@mermaid-js/mermaid-cli` on demand)
- Internet access at render time (icon packs downloaded once per run)

---

## Step 1: Analyze the Terraform Module

1. Read all `.tf` files in the module directory
2. Extract:
   - **Resources**: `resource "azurerm_*" / "aws_*" / "github_*"`
   - **Data sources**: `data "type" "name"`
   - **Module calls**: `module "name"`
3. Identify the cloud provider from resource prefixes:
   - `azurerm_*` -> Azure
   - `aws_*` -> AWS
   - `github_*` -> GitHub (use Font Awesome icons)

---

## Step 2: Design the Mermaid Diagram

### Diagram Type

Use **`flowchart LR`** (Left-Right) for modules with 5+ resources. Use `flowchart TD` for simple, linear pipelines.

> **Why not `architecture-beta`?** `flowchart LR` with `icon:` metadata produces equivalent visual output, has better tooling support (mmdc, mermaid.live, GitHub), and more expressive edge syntax for Terraform dependency graphs.

### Icon Syntax

Add icons to flowchart nodes using the `@{ icon: ... }` metadata:

```
nodeId["Node Label"]
nodeId@{ icon: "pack:icon-name" }
```

**Azure pack prefix**: `azure` (lowercase) — e.g., `azure:virtual-networks`
**AWS pack prefix**: `logos` — e.g., `logos:aws-lambda`

### Azure Icon Reference

| Resource                   | Icon name                           |
| -------------------------- | ----------------------------------- |
| Resource Group             | `azure:resource-groups`             |
| Virtual Network            | `azure:virtual-networks`            |
| Key Vault                  | `azure:key-vaults`                  |
| Storage Account            | `azure:storage-accounts`            |
| Function App               | `azure:function-apps`               |
| App Service                | `azure:app-services`                |
| App Service Plan           | `azure:app-service-plans`           |
| Worker Container App       | `azure:worker-container-app`        |
| Container Apps Environment | `azure:container-apps-environments` |
| API Management             | `azure:api-management-services`     |
| Application Insights       | `azure:application-insights`        |
| Log Analytics Workspace    | `azure:log-analytics-workspaces`    |
| Managed Identity           | `azure:managed-identities`          |
| Service Bus                | `azure:azure-service-bus`           |
| Event Hub                  | `azure:event-hubs`                  |
| SQL Database               | `azure:sql-database`                |
| Cosmos DB                  | `azure:azure-cosmos-db`             |
| AKS                        | `azure:kubernetes-services`         |
| Private Endpoint           | `azure:private-endpoints`           |
| DNS Zone                   | `azure:dns-zones`                   |

> Full icon list (566 icons): https://raw.githubusercontent.com/NakayamaKento/AzureIcons/refs/heads/main/icons.json

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
        vnet@{ icon: "azure:virtual-networks"}
        subnet["Subnet"]
    end

    subgraph Compute["Compute Layer"]
        func["Function App"]
        func@{ icon: "azure:function-apps"}
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
- **Limit arrows**: 1-2 per resource; aim for 5-10 arrows total. Connect subgraphs to subgraphs, not individual nodes
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
        vnet@{ icon: "azure:virtual-networks"}
        subnet["Subnet"]
    end

    subgraph Compute["Compute Layer"]
        asp["App Service Plan"]
        asp@{ icon: "azure:app-service-plans"}

        func["Function App"]
        func@{ icon: "azure:function-apps"}
    end

    subgraph Secrets["Secrets & Storage"]
        kv["Key Vault"]
        kv@{ icon: "azure:key-vaults"}

        st["Storage Account"]
        st@{ icon: "azure:storage-accounts"}
    end

    subgraph Monitoring["Monitoring"]
        ai["App Insights"]
        ai@{ icon: "azure:application-insights"}

        law["Log Analytics"]
        law@{ icon: "azure:log-analytics-workspaces"}
    end

    Network --> Compute
    Compute --> Secrets
    Monitoring -.-> Compute
```

---

## Step 4: Validate Syntax (Optional but Recommended)

### Option A — Mermaid MCP Server (if configured)

If the `mermaid-mcp` MCP server is available in your environment, use the `validate_and_render_mermaid_diagram` tool:

```
validate_and_render_mermaid_diagram(diagram: "<mermaid code>")
```

This tool is **free and requires no authentication**. It:

- Validates the Mermaid syntax server-side
- Returns a rendered PNG preview
- Provides an **interactive link** at https://mermaid.live/chart/... where you can inspect and edit the diagram live

**Icon note**: The MCP server renders on MermaidChart's infrastructure and uses its own registered `azure:` pack — Azure icons will render correctly. AWS `logos:` icons may show as grey placeholders in the MCP preview, but will be fully visible in the locally-rendered SVG (Step 5).

**Setup** (add to your MCP client config if not already configured):

```json
{
  "servers": {
    "mermaid-mcp": {
      "url": "https://mcp.mermaid.ai/mcp",
      "type": "http"
    }
  }
}
```

Full docs: https://mermaid.ai/docs/ai/mcp-server

### Option B — mermaid.live (always available)

If MCP is not configured, validate the syntax manually by visiting:
https://mermaid.live

Paste the diagram code there to check for syntax errors before rendering.

---

## Step 5: Convert `diagram.mmd` to `diagram.svg`

Run the render script included in this skill:

```bash
node scripts/render-svg.mjs {module_path}/diagram.mmd
```

This produces `{module_path}/diagram.svg` with icons **fully inlined** as SVG paths — visible offline, in GitHub, in VS Code, everywhere, no external fetching needed at view time.

**Equivalent direct `mmdc` command**:

```bash
mmdc \
  -i {module_path}/diagram.mmd \
  -o {module_path}/diagram.svg \
  -t dark -b transparent \
  --iconPacksNamesAndUrls "azure#https://raw.githubusercontent.com/NakayamaKento/AzureIcons/refs/heads/main/icons.json" \
  --iconPacks @iconify-json/logos
```

**If `mmdc` is not installed**, install it first:

```bash
# Run once without installing
npx -y @mermaid-js/mermaid-cli \
  -i {module_path}/diagram.mmd \
  -o {module_path}/diagram.svg \
  -t dark \
  -b transparent \
  --iconPacksNamesAndUrls "azure#https://raw.githubusercontent.com/NakayamaKento/AzureIcons/refs/heads/main/icons.json" \
  --iconPacks @iconify-json/logos

# Or global install (recommended for repeated use)
npm install -g @mermaid-js/mermaid-cli
```

> Requires Node.js >= 18. On first run, mmdc downloads Chromium (~170 MB, one-time). Full docs: https://github.com/mermaid-js/mermaid-cli

**If `mmdc` fails with a sandbox error** (common in Linux CI or containers), create a puppeteer config and pass it with `-p`:

```bash
echo '{"args":["--no-sandbox"]}' > /tmp/puppeteer.json
mmdc \
  -i {module_path}/diagram.mmd \
  -o {module_path}/diagram.svg \
  -t dark \
  -b transparent \
  -p /tmp/puppeteer.json \
  --iconPacksNamesAndUrls "azure#https://raw.githubusercontent.com/NakayamaKento/AzureIcons/refs/heads/main/icons.json" \
  --iconPacks @iconify-json/logos
```

> **Troubleshooting**: If icons show as empty squares with a question mark inside, verify the icon name exists in the pack.
> Azure icons: https://github.com/NakayamaKento/AzureIcons
> AWS icons: https://icon-sets.iconify.design/logos/ (filter `aws-`)

---

## Step 6: Update `README.md`

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

## Diagram               <- last manual section

![diagram](./diagram.svg)

<!-- BEGIN_TF_DOCS -->   <- auto-generated content starts here
```

Rules:

- Heading is exactly `## Diagram`
- Content is only `![diagram](./diagram.svg)` — no legend, no extra text
- Never place the section after `<!-- BEGIN_TF_DOCS -->`

---

## Completion Summary

After all steps succeed, report:

- List of main resources included in the diagram
- Link to the mermaid.live interactive preview (if MCP was used for validation)
- `diagram.mmd` created/updated — full path
- `diagram.svg` generated — full path and file size
- `README.md` updated — full path
- Any issues encountered (e.g., unknown icon names, render errors)
