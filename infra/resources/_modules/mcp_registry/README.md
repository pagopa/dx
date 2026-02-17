# MCP Registry Module

This Terraform module creates an Azure API Center to manage and register Model Context Protocol (MCP) servers.

## Features

- Creates an Azure API Center service
- Configures a default workspace and production environment
- Registers multiple MCP servers using `for_each` iteration
- Creates API versions, definitions (SSE and Streamable), and deployments for each MCP server
- Fully customizable through variables

## Usage

```hcl
module "mcp_registry" {
  source = "./_modules/mcp_registry"

  naming_config = {
    prefix          = "dx"
    environment     = "p"
    region          = "weu"
    instance_number = 1
  }

  resource_group_id = "/subscriptions/xxx/resourceGroups/my-rg"
  location          = "westeurope"

  mcp_servers = {
    dx = {
      name        = "dx"
      title       = "DX MCP Server"
      summary     = "Developer Experience MCP Server"
      description = "An MCP server that supports developers using DX tools."
      external_documentation = [
        {
          title = "DX Documentation"
          url   = "https://dx.pagopa.it/docs/coding-with-ai/dx-mcp-server"
        }
      ]
      version = {
        name            = "0-0-9"
        title           = "0.0.9"
        lifecycle_stage = "production"
      }
      deployment = {
        runtime_uri = "https://api.dx.pagopa.it/mcp"
      }
    }

    github = {
      name        = "github-mcp-server"
      title       = "GitHub MCP Server"
      summary     = "GitHub integration for AI assistants"
      description = "Connect AI assistants to GitHub - manage repos, issues, PRs, and workflows."
      external_documentation = []
      version = {
        name            = "0-24-0"
        title           = "0.24.0"
        lifecycle_stage = "production"
      }
      deployment = {
        runtime_uri = "https://api.githubcopilot.com/mcp/"
      }
    }
  }
}
```

## Variables

### Required Variables

- `naming_config`: Object containing naming convention configuration
  - `prefix`: Naming prefix (e.g., "dx")
  - `environment`: Environment identifier (e.g., "p" for production)
  - `region`: Azure region abbreviation (e.g., "weu" for West Europe)
  - `instance_number`: Instance number for the service

- `resource_group_id`: The Azure resource group ID where resources will be created

- `mcp_servers`: Map of MCP server configurations (see structure below)

### Optional Variables

- `location`: Azure region (default: "westeurope")
- `sku_name`: API Center SKU (default: "Free")
- `workspace_config`: Workspace configuration (default: sensible defaults)
- `environment_config`: Environment configuration (default: production settings)

### MCP Server Structure

Each entry in `mcp_servers` map requires:

```hcl
{
  name        = "server-name"           # API name in API Center
  title       = "Server Title"          # Display title
  summary     = "Short description"     # Brief summary
  description = "Full description"      # Detailed description
  external_documentation = [            # Optional documentation links
    {
      title = "Doc Title"
      url   = "https://example.com/docs"
    }
  ]
  version = {
    name            = "x-y-z"           # Version identifier (use dashes, not dots)
    title           = "x.y.z"           # Display version
    lifecycle_stage = "production"      # Lifecycle stage
  }
  deployment = {
    runtime_uri = "https://api.example.com/mcp"  # Runtime endpoint
  }
}
```

## Outputs

- `apic_service_id`: The ID of the API Center service
- `apic_service_name`: The name of the API Center service
- `workspace_id`: The ID of the default workspace
- `environment_id`: The ID of the production environment
- `mcp_api_ids`: Map of MCP server names to their API IDs
- `mcp_deployment_ids`: Map of MCP server names to their deployment IDs

## Adding New MCP Servers

To add a new MCP server, simply add a new entry to the `mcp_servers` map:

```hcl
mcp_servers = {
  # ... existing servers ...

  my_new_server = {
    name        = "my-new-mcp-server"
    title       = "My New MCP Server"
    summary     = "Does amazing things"
    description = "A detailed description of what this server does."
    external_documentation = []
    version = {
      name            = "1-0-0"
      title           = "1.0.0"
      lifecycle_stage = "production"
    }
    deployment = {
      runtime_uri = "https://api.example.com/mcp/mynewserver"
    }
  }
}
```

## Notes

- Schema validation is disabled (`schema_validation_enabled = false`) because the API Center API is in preview
- Version names must use dashes instead of dots (e.g., "0-0-9" instead of "0.0.9")
- Each MCP server automatically gets:
  - An API entry
  - A version
  - Two definitions (SSE and Streamable)
  - A deployment to the production environment

## Requirements

- Terraform >= 1.0
- Azure AzAPI provider >= 2.6.0
- Azure subscription with permissions to create API Center resources
