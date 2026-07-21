resource "azurerm_api_management_backend" "foundry" {
  name                = "foundry"
  api_management_name = module.apim.name
  resource_group_name = var.resource_group_name
  protocol            = "http"
  url                 = var.foundry.project_endpoint

  circuit_breaker_rule {
    name          = "default"
    trip_duration = "PT30S"
    failure_condition {
      interval_duration = "PT1M"
      count             = 5
      status_code_range {
        min = 500
        max = 599
      }
    }
  }
}

resource "azurerm_api_management_api_version_set" "foundry" {
  name                = "ai-foundry"
  api_management_name = module.apim.name
  resource_group_name = var.resource_group_name
  display_name        = "AI Foundry"
  versioning_scheme   = "Segment"
}

resource "azurerm_api_management_api" "foundry" {
  name                  = "ai-foundry"
  api_management_name   = module.apim.name
  resource_group_name   = var.resource_group_name
  revision              = "1"
  version               = "v1"
  version_set_id        = azurerm_api_management_api_version_set.foundry.id
  display_name          = "AI Foundry"
  path                  = "ai"
  protocols             = ["https"]
  subscription_required = false
}

resource "azurerm_api_management_api_operation" "responses" {
  operation_id        = "create-response"
  api_name            = azurerm_api_management_api.foundry.name
  api_management_name = module.apim.name
  resource_group_name = var.resource_group_name
  display_name        = "Create response"
  method              = "POST"
  url_template        = "/responses"
}

resource "azurerm_api_management_api_operation_tag" "responses" {
  api_operation_id = azurerm_api_management_api_operation.responses.id
  name             = "terraform-permission-check"
  display_name     = "Terraform Permission Check"
}

resource "azurerm_api_management_api_policy" "foundry" {
  api_name            = azurerm_api_management_api.foundry.name
  api_management_name = module.apim.name
  resource_group_name = var.resource_group_name

  xml_content = <<XML
<policies>
  <inbound>
    <base />
    <set-backend-service backend-id="${azurerm_api_management_backend.foundry.name}" />
    <rewrite-uri template="/openai/v1/responses" copy-unmatched-params="true" />
    <authentication-managed-identity resource="https://ai.azure.com" />
    <llm-emit-token-metric>
      <dimension name="Operation ID" />
    </llm-emit-token-metric>
    <llm-token-limit remaining-quota-tokens-header-name="remaining-tokens" remaining-tokens-header-name="remaining-tokens" tokens-per-minute="100000" token-quota="10000000" token-quota-period="Daily" counter-key="@(context.Request.IpAddress)" estimate-prompt-tokens="false" tokens-consumed-header-name="consumed-tokens" />
    <!--TODO: add cache-->
  </inbound>
  <backend>
    <base />
  </backend>
  <outbound>
    <base />
  </outbound>
  <on-error>
    <base />
  </on-error>
</policies>
XML
}
