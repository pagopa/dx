# API Center Service
resource "azapi_resource" "apic_service" {
  type      = "Microsoft.ApiCenter/services@2024-06-01-preview"
  name      = local.api_center_name
  parent_id = var.resource_group_id
  location  = var.location
  tags      = var.tags

  body = {
    sku = {
      name = "Free"
    }
    properties = {}
  }

  schema_validation_enabled = false
  ignore_casing             = false
  ignore_missing_property   = true
  ignore_null_property      = false
}

# Production Environment
resource "azapi_resource" "prod_environment" {
  type      = "Microsoft.ApiCenter/services/workspaces/environments@2024-06-01-preview"
  name      = "prod"
  parent_id = "${azapi_resource.apic_service.id}/workspaces/default"

  body = {
    properties = {
      title = "prod"
      kind  = "production"
      server = {
        managementPortalUri = []
      }
      onboarding = {
        developerPortalUri = []
      }
      customProperties = {}
    }
  }

  schema_validation_enabled = true
}

# Metadata Schema: type (string with predefined choices)
resource "azapi_resource" "metadata_type" {
  type      = "Microsoft.ApiCenter/services/metadataSchemas@2024-03-01"
  name      = "type"
  parent_id = azapi_resource.apic_service.id

  body = {
    properties = {
      schema = jsonencode({
        type  = "string"
        title = "Type"
        oneOf = [
          {
            const       = "local"
            description = "Local MCP server (runs via command)"
          },
          {
            const       = "remote"
            description = "Remote MCP server (accessible via URI)"
          }
        ]
      })
      assignedTo = [
        {
          entity   = "api"
          required = false
        }
      ]
    }
  }

  schema_validation_enabled = false
}

# Metadata Schema: visibility (boolean)
resource "azapi_resource" "metadata_visibility" {
  type      = "Microsoft.ApiCenter/services/metadataSchemas@2024-03-01"
  name      = "visibility"
  parent_id = azapi_resource.apic_service.id

  body = {
    properties = {
      schema = jsonencode({
        type  = "boolean"
        title = "Visibility"
      })
      assignedTo = [
        {
          entity   = "api"
          required = false
        }
      ]
    }
  }

  schema_validation_enabled = false
}

# MCP Server APIs
resource "azapi_resource" "mcp_api" {
  for_each = var.mcp_servers

  type      = "Microsoft.ApiCenter/services/workspaces/apis@2024-06-01-preview"
  name      = each.value.name
  parent_id = "${azapi_resource.apic_service.id}/workspaces/default"

  body = {
    properties = {
      title                 = each.value.name
      summary               = each.value.description
      description           = each.value.description
      kind                  = "mcp"
      externalDocumentation = each.value.external_documentation
      contacts              = []
      customProperties = {
        type       = each.value.type
        visibility = each.value.visibility
      }
    }
  }

  schema_validation_enabled = true

  depends_on = [
    azapi_resource.metadata_type,
    azapi_resource.metadata_visibility
  ]
}

# MCP Server API Versions
resource "azapi_resource" "mcp_version" {
  for_each = local.mcp_versions

  type      = "Microsoft.ApiCenter/services/workspaces/apis/versions@2024-06-01-preview"
  name      = replace(each.value.version, ".", "-")
  parent_id = azapi_resource.mcp_api[each.value.server_key].id

  body = {
    properties = {
      title          = each.value.version
      lifecycleStage = "production"
    }
  }

  schema_validation_enabled = true
}

# SSE Definitions (for servers with sse protocol enabled)
resource "azapi_resource" "mcp_sse_definition" {
  for_each = {
    for k, v in local.mcp_versions : k => v
    if v.protocols != null && v.protocols.sse
  }

  type      = "Microsoft.ApiCenter/services/workspaces/apis/versions/definitions@2024-06-01-preview"
  name      = "default-sse"
  parent_id = azapi_resource.mcp_version[each.key].id

  body = {
    properties = {
      title       = "SSE Definition for ${each.value.server_name}"
      description = "Auto-generated definition for ${each.value.server_name}"
    }
  }

  schema_validation_enabled = true
}

# Streamable Definitions (for servers with streamable protocol enabled)
resource "azapi_resource" "mcp_streamable_definition" {
  for_each = {
    for k, v in local.mcp_versions : k => v
    if v.protocols != null && v.protocols.streamable
  }

  type      = "Microsoft.ApiCenter/services/workspaces/apis/versions/definitions@2024-06-01-preview"
  name      = "default-streamable"
  parent_id = azapi_resource.mcp_version[each.key].id

  body = {
    properties = {
      title       = "Streamable Definition for ${each.value.server_name}"
      description = "Auto-generated definition for ${each.value.server_name}"
    }
  }

  schema_validation_enabled = true
}

# SSE Deployments (for servers with sse protocol enabled)
resource "azapi_resource" "mcp_sse_deployment" {
  for_each = {
    for k, v in local.mcp_versions : k => v
    if v.protocols != null && v.protocols.sse
  }

  type      = "Microsoft.ApiCenter/services/workspaces/apis/deployments@2024-06-01-preview"
  name      = "sse-deployment"
  parent_id = azapi_resource.mcp_api[each.value.server_key].id

  body = {
    properties = {
      title         = "SSE Deployment to prod"
      environmentId = "/workspaces/default/environments/prod"
      definitionId  = "/workspaces/default/apis/${each.value.server_name}/versions/${azapi_resource.mcp_version[each.key].name}/definitions/default-sse"
      server = {
        runtimeUri = [
          each.value.uri
        ]
      }
      customProperties = {}
    }
  }

  schema_validation_enabled = false

  depends_on = [
    azapi_resource.prod_environment,
    azapi_resource.mcp_sse_definition
  ]
}

# Streamable Deployments (for servers with streamable protocol enabled)
resource "azapi_resource" "mcp_streamable_deployment" {
  for_each = {
    for k, v in local.mcp_versions : k => v
    if v.protocols != null && v.protocols.streamable
  }

  type      = "Microsoft.ApiCenter/services/workspaces/apis/deployments@2024-06-01-preview"
  name      = "streamable-deployment"
  parent_id = azapi_resource.mcp_api[each.value.server_key].id

  body = {
    properties = {
      title         = "Streamable Deployment to prod"
      environmentId = "/workspaces/default/environments/prod"
      definitionId  = "/workspaces/default/apis/${each.value.server_name}/versions/${azapi_resource.mcp_version[each.key].name}/definitions/default-streamable"
      server = {
        runtimeUri = [
          each.value.uri
        ]
      }
      customProperties = {}
    }
  }

  schema_validation_enabled = false

  depends_on = [
    azapi_resource.prod_environment,
    azapi_resource.mcp_streamable_definition
  ]
}

