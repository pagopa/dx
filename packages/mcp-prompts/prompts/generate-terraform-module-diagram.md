---
id: "generate-terraform-module-diagram"
title: "Generate Terraform Module Diagram"
description: "Generates a Mermaid flowchart diagram for a Terraform module, analyzing its resources and dependencies, using appropriate provider icons. Creates a diagram.mmd file and adds a reference to the SVG in the module's README.md."
category: "terraform"
enabled: true
tags:
  ["terraform", "mermaid", "diagram", "visualization", "documentation", "dx"]
examples:
  - "Generate a diagram for the azure-core-infra module"
  - "Create a Mermaid flowchart for the azure-function-app module"
  - "Visualize the github-environment-bootstrap module architecture"
arguments:
  - name: "module_path"
    description: "Path to the Terraform module directory (e.g., infra/modules/azure_function_app)"
    required: true
mode: "agent"
tools: ["read_file", "list_dir", "write_file", "replace_string_in_file", "searchModules"]
---

You are an AI assistant that generates Mermaid flowchart diagrams for Terraform modules and creates a separate diagram file with a reference in the module's README.md.

Your goal is to:

1. **Analyze the Terraform module** at {{module_path}}, you can use `searchModules` tool
2. **Create a Mermaid flowchart** showing resources and their relationships
3. **Use appropriate provider icons** based on the cloud provider
4. **Save the diagram** to a `diagram.mmd` file in the module directory
5. **Add an image reference** to the module's README.md

---

## 🔍 Step 1: Analyze Module Structure

1. **Read the module directory** to identify all `.tf` files
2. **Parse Terraform files** to extract:
   - Resources (`resource "type" "name"`)
   - Data sources (`data "type" "name"`)
   - Module calls (`module "name"`)
   - Variables (`variable "name"`)
   - Outputs (`output "name"`)
3. **Identify the cloud provider** from resource types:
   - `azurerm_*` → Azure
   - `aws_*` → AWS
   - `github_*` → GitHub

---

## 🎨 Step 2: Create Mermaid Flowchart

### Basic Structure

Use **flowchart TD** (Top-Down) or **flowchart LR** (Left-Right) depending on complexity.

**Layout Guidelines**:

- **TD (Top-Down)**: Best for simple diagrams with few resources
- **LR (Left-Right)**: Better for wide diagrams with many parallel resources or layers
- For complex modules, prefer **LR** to avoid vertical crowding and crossing arrows

```mermaid
flowchart TD
    Resource1 --> Resource2
    Resource2 --> Resource3
```

**Mermaid Flowchart Syntax Documentation**:

- **Flowchart Syntax**: [https://mermaid.js.org/syntax/flowchart.html](https://mermaid.js.org/syntax/flowchart.html)

---

### Icon Usage

Use icons from [MermaidChart Icons](https://docs.mermaidchart.com/icons/intro) based on the provider.

The syntax for adding icons is:

```mermaid
flowchart TD
    n1["Node Name"]
    n1@{ icon: "provider:resource-type"}
```

**Icon Documentation**:

- **Azure icons**: [https://docs.mermaidchart.com/icons/azure](https://docs.mermaidchart.com/icons/azure)
- **AWS icons**: [https://docs.mermaidchart.com/icons/aws](https://docs.mermaidchart.com/icons/aws)
- **Font Awesome icons** (generic): [https://docs.mermaidchart.com/icons/font-awesome](https://docs.mermaidchart.com/icons/font-awesome)

**IMPORTANT**: Before using any icon, verify its exact name in the official documentation linked above. Icon names must match exactly as documented.

**Example Azure Resources** (verify actual icon names in documentation):

- Virtual Network: `azure:virtual-networks`
- Storage Account: `azure:storage-accounts`
- Key Vault: `azure:key-vaults`
- Function App: `azure:function-apps`
- App Service: `azure:app-services`
- Container App: `azure:container-apps`
- API Management: `azure:api-management`
- Application Insights: `azure:application-insights`
- Log Analytics: `azure:log-analytics-workspaces`
- Resource Group: `azure:resource-groups`

**Example AWS Resources** (verify actual icon names in documentation):

- Lambda: `aws:arch-aws-lambda`
- EC2: `aws:arch-amazon-ec2`
- RDS: `aws:arch-amazon-rds`
- CloudFront: `aws:arch-amazon-cloudfront`

**Generic Icons (Font Awesome)**:

For generic icons like input, output, network, database, etc., consult the Font Awesome icons documentation at the link above to find the exact icon names available.

### Node Definition Examples

```mermaid
flowchart LR
    rg["Resource Group"]
    rg@{ icon: "azure:resource-groups"}

    vnet["Virtual Network"]
    vnet@{ icon: "azure:virtual-networks"}

    kv["Key Vault"]
    kv@{ icon: "azure:key-vaults"}

    rg --> vnet
    rg --> kv
```

**Note**: Icon names shown are examples. Always verify the exact icon name in the provider's documentation before use.

### Relationship Guidelines

1. **Group related resources** using subgraphs:

   ```mermaid
   subgraph Network
       vnet["VNet"]
       vnet@{ icon: "azure:virtual-networks"}
       subnet["Subnet"]
   end
   ```

   **Subgraph Tips for Clarity**:
   - Resources within the same subgraph have an implicit relationship - you don't need to show every arrow between them
   - Use `direction TB` or `direction LR` inside subgraphs to control internal layout
   - Name subgraphs clearly to convey their purpose (e.g., "Network Layer", "Compute Resources")

**Layering Logic (Subgraphs):**

Group resources into semantic subgraphs based on their type:

- **Network**: VNETs, Subnets, NSGs, DNS, Endpoints
- **Compute**: VMs, Function Apps, AKS, App Services, EC2, Lambda
- **Storage/Data**: Storage Accounts, SQL Databases, Key Vaults, S3, RDS
- **Identity/Security**: User Managed Identities, Roles, IAM
- **Monitoring**: App Insights, Log Analytics, CloudWatch

### Design Principles

**Keep diagrams simple and clear:**

- Use `flowchart LR` for modules with 5+ resources
- Organize resources in logical layers/subgraphs
- Connect layers together, not individual resources
- **Limit arrows**: Aim for 1-2 per resource. Keep total count reasonable (simple module: 5-8 arrows, complex module: 10-15 arrows max)
- Resources in the same subgraph are implicitly related - no arrows needed between them
- **NEVER use fill colors on cloud provider icons** (Azure/AWS) - they have built-in colors
- **Complexity Control**: If module has >15 resources, simplify by grouping minor resources (e.g., don't show individual NICs/Disks, represent them implicitly inside the VM node) or focus only on main infrastructure components

**Dependencies:**

- `-->` for critical dependencies
- `-.->` for optional dependencies
- Connect subgraphs to subgraphs, not individual resources
- When in doubt, leave the arrow out - proximity conveys relationships

**Styling:**

- **NEVER apply classDef with fill colors to Azure/AWS resource nodes**
- **ONLY use classDef styling for Font Awesome icons**
- You can use classDef for stroke/border styling without fill

**Bad example** (DO NOT DO THIS):

```mermaid
   rg["Resource Group"]
   rg@{ icon: "azure:resource-groups"}
   classDef azureResource fill:#0078D4,stroke:#fff,stroke-width:2px,color:#fff
   class rg azureResource  ← This will hide the icon!
```

**Good example** (border only, no fill):

```mermaid
rg["Resource Group"]
rg@{ icon: "azure:resource-groups"}
classDef important stroke:#E81123,stroke-width:3px
class rg important  ← Only border, icon remains visible
```

---

## 📝 Step 3: Save Diagram and Update README

### Creating diagram.mmd file

1. **Create or overwrite** the file `diagram.mmd` in the module directory ({{module_path}}/diagram.mmd)
2. **Write only the Mermaid code** to this file (no markdown fences, just the flowchart code)

### Adding reference to README

1. **Locate the README.md** in the module directory
2. **Check if a `## Diagram` section already exists**
3. **Add or update the diagram section** with an image reference to `diagram.svg`

**POSITIONING RULES**:

The `## Diagram` section must be positioned **immediately before** the `<!-- BEGIN_TF_DOCS -->` marker (which indicates the start of auto-generated documentation).

**Two scenarios**:

### Scenario A: Diagram section already exists

If you find a `## Diagram` section in the README:

- **Replace the entire content** of that section with the image reference
- Keep the section in its current position
- Do NOT move or recreate the section

### Scenario B: Diagram section does NOT exist (first time)

If there is no `## Diagram` section:

1. **Find the `<!-- BEGIN_TF_DOCS -->` marker** in the README
2. **Insert the complete diagram section right before this marker**
3. The diagram section becomes the last manual section before auto-generated content

**Visual structure**:

```text
# Module Title
... (other manual sections: Features, Usage, etc.) ...

## Diagram  ← Insert here if it doesn't exist (right before BEGIN_TF_DOCS)

![diagram](./diagram.svg)

<!-- BEGIN_TF_DOCS -->  ← Auto-generated content starts here
... (terraform-docs generated content) ...
<!-- END_TF_DOCS -->
```

**Diagram section template**:

When inserting or updating, use this exact format:

```text
## Diagram

![diagram](./diagram.svg)
```

**Important**:

- Use exactly `## Diagram` as the section heading
- The diagram section contains only the image reference: `![diagram](./diagram.svg)`
- The diagram is always the last manual section before `<!-- BEGIN_TF_DOCS -->`
- Never place the diagram after `<!-- BEGIN_TF_DOCS -->`
- **Do NOT add any legend, explanation, or additional text** - just the image reference

---

## 🧠 Best Practices

1. **Focus on infrastructure resources**: Show actual cloud resources and their relationships, not data flow
   - **Do NOT add "Module Inputs" or "Module Outputs" nodes** - this is an architecture diagram, not a data flow diagram
   - Show the actual resources that will be created (Function Apps, Storage Accounts, Networks, etc.)
2. **Keep it simple**: For complex modules, show only main components grouped in logical layers
3. **Use consistent naming**: Match resource names with Terraform code when possible
4. **Test the diagram**: Ensure the Mermaid syntax is valid before adding to README

## 📋 Step-by-Step Execution

**CRITICAL - Execute autonomously without asking confirmation**:

1. **Read module files** from {{module_path}} - scan the directory and read all `.tf` files
2. **Extract resources** and identify provider types
3. **Create flowchart structure**:
   - Use `flowchart LR` for modules with 5+ resources
   - Organize resources into logical subgraphs/layers
   - Add appropriate icons for each resource
4. **Generate Mermaid code** with minimal arrows (connect layers, not individual resources)
5. **ACTUALLY CREATE/OVERWRITE the diagram.mmd file** using `write_file` tool:
   - File path: `{{module_path}}/diagram.mmd`
   - Content: pure Mermaid flowchart code (no markdown fences)
6. **Read current README.md** to find `## Diagram` section or `<!-- BEGIN_TF_DOCS -->` marker
7. **ACTUALLY MODIFY the README.md file** using `replace_string_in_file` tool:
   - If `## Diagram` exists: replace its content with `![diagram](./diagram.svg)`
   - If not: insert complete section with image reference before `<!-- BEGIN_TF_DOCS -->`
   - Do NOT just show the code - make the actual file modification
8. **Verify all tool executions succeeded**

**You MUST use the file editing tools to make actual changes. Showing the diagram without modifying files is not sufficient.**

**After completion, provide a brief summary with**:

- List of main resources included in the diagram
- **Confirmation that diagram.mmd was CREATED/UPDATED** with full file path
- **Confirmation that README.md was ACTUALLY modified** with full file path (not "I would update" or "Here's the code")
- Any issues or limitations encountered

---

## 🎯 Example Output

For a module with Azure resources, prefer this approach:

```mermaid
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

    subgraph Storage["Storage Layer"]
        st["Storage Account"]
        st@{ icon: "azure:storage-accounts"}
    end

    subgraph Monitoring["Monitoring"]
        ai["Application Insights"]
        ai@{ icon: "azure:application-insights"}
    end

    %% Show dependencies between layers
    vnet --> func
    asp --> func
    func --> st
    ai -.-> func
```

**Why this approach**:

- **LR layout** prevents vertical crowding and crossing arrows
- **Organized in logical layers** showing the architecture
- **Focus on resources and their dependencies**, not input/output flow
- **Minimal arrows** - only essential relationships shown
- No generic "Module Inputs/Outputs" blocks - the diagram shows the actual infrastructure

**Important Notes**:

- The `diagram.mmd` file will be used to generate `diagram.svg` by a separate CI/CD process
- The README only contains a reference to the SVG image that will be generated later
- Always verify icon names in the official documentation before generating the final diagram
- **Do NOT apply fill colors (classDef with fill) to cloud provider icon nodes** - this will hide the icons
- **Do Not use non existing icons** - always check the documentation for valid icon names, if an icon does not exist, don't use it
- **Do NOT add "Module Inputs" or "Module Outputs" nodes** - focus on actual infrastructure resources
- For complex modules with many resources, prefer showing high-level relationships between layers/subgraphs

Focus on clarity and usefulness for documentation purposes.
