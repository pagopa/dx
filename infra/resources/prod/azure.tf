module "azure_core_values" {
  source  = "pagopa-dx/azure-core-values-exporter/azurerm"
  version = "~> 0.0"

  core_state = local.core_state
}

module "dx_website" {
  source = "../_modules/dx_website"

  resource_group_name         = module.azure_core_values.common_resource_group_name
  network_resource_group_name = module.azure_core_values.network_resource_group_name
  naming_config               = local.azure_naming_config
  tags                        = local.tags
}

module "mcp_registry" {
  source = "../_modules/mcp_registry"

  naming_config     = merge(local.azure_naming_config, { location = "weu" })
  resource_group_id = module.azure_core_values.common_resource_group_id
  location          = "westeurope"

  mcp_servers = {
    dx = {
      name        = "dx-mcp-server"
      description = "An MCP server that support developers using DX tools."
      versions    = ["0.0.9"]
      uri         = "https://api.dx.pagopa.it/mcp"
      external_documentation = [
        {
          title = "DX Documentation"
          url   = "https://dx.pagopa.it/docs/coding-with-ai/dx-mcp-server"
        }
      ]
    }

    github = {
      name        = "github-mcp-server"
      description = "Connect AI assistants to GitHub - manage repos, issues, PRs, and workflows through natural language."
      versions    = ["0.24.0"]
      uri         = "https://api.githubcopilot.com/mcp/"
      external_documentation = [
        {
          title = "DX Documentation"
          url   = "https://github.com/github/github-mcp-server"
        }
      ]
    }
  }

  tags = local.tags
}
