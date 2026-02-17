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

  cdn = {
    resource_group_name         = module.azure_core_values.common_resource_group_name
    network_resource_group_name = module.azure_core_values.network_resource_group_name
  }

  mcp_servers = {
    dx = {
      name        = "dx-mcp-server"
      description = "An MCP server that support developers using DX tools."
      versions    = ["0.0.9"]
      type        = "remote"
      visibility  = true
      uri         = "https://api.dx.pagopa.it/mcp"
      protocols = {
        streamable = true
      }
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
      type        = "remote"
      visibility  = true
      uri         = "https://api.githubcopilot.com/mcp/"
      protocols = {
        streamable = true
      }
      external_documentation = [
        {
          title = "Github repository"
          url   = "https://github.com/github/github-mcp-server"
        }
      ]
    }

    aws_knowledge = {
      name        = "aws-knowledge-mcp-server"
      description = "Provides AWS documentation, code samples, and regional availability info for APIs and CloudFormation resources."
      versions    = ["1.0.0"]
      type        = "remote"
      visibility  = true
      uri         = "https://knowledge-mcp.global.api.aws"
      protocols = {
        streamable = true
      }
      external_documentation = [
        {
          title = "AWS Knowledge MCP Server Documentation"
          url   = "https://github.com/awslabs/mcp/tree/main/src/aws-knowledge-mcp-server"
        }
      ]
    }

    azure_learn = {
      name        = "azure-learn-mcp-server"
      description = "Stop relying on outdated training data or risky web searches. Learn MCP server provides secure, direct access to Microsoft official docs."
      versions    = ["1.0.0"]
      type        = "remote"
      visibility  = true
      uri         = "https://learn.microsoft.com/api/mcp"
      protocols = {
        streamable = true
      }
      external_documentation = [
        {
          title = "Azure Learn MCP Server Documentation"
          url   = "https://github.com/microsoftdocs/mcp"
        }
      ]
    }
  }

  tags = local.tags
}
