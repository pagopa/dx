# API Center Service
resource "azapi_resource" "apic_service" {
  type      = "Microsoft.ApiCenter/services@2024-06-01-preview"
  name      = "${var.naming_config.prefix}-${var.naming_config.environment}-${var.naming_config.location}-common-apic-mcp-registry-${format("%02d", var.naming_config.instance_number)}"
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
      customProperties      = {}
    }
  }

  schema_validation_enabled = true
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

# SSE Definitions
resource "azapi_resource" "mcp_sse_definition" {
  for_each = local.mcp_versions

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

# Streamable Definitions
resource "azapi_resource" "mcp_streamable_definition" {
  for_each = local.mcp_versions

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

# Deployments
resource "azapi_resource" "mcp_deployment" {
  for_each = local.mcp_versions

  type      = "Microsoft.ApiCenter/services/workspaces/apis/deployments@2024-06-01-preview"
  name      = "default-deployment"
  parent_id = azapi_resource.mcp_api[each.value.server_key].id

  body = {
    properties = {
      title         = "Deployment to prod"
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

  schema_validation_enabled = true

  depends_on = [
    azapi_resource.prod_environment,
    azapi_resource.mcp_sse_definition
  ]
}

