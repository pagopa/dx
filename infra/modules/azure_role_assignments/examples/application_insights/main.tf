resource "azurerm_resource_group" "example" {
  name     = "${local.resource_prefix}-${local.environment.domain}-roles-rg-${local.environment.instance_number}"
  location = local.environment.location

  tags = local.tags
}

resource "azurerm_application_insights" "this" {
  name                = "${local.resource_prefix}-${local.environment.domain}-ai-${local.environment.instance_number}"
  resource_group_name = azurerm_resource_group.example.name
  location            = local.environment.location
  application_type    = "web"

  tags = local.tags
}

module "function" {
  source  = "pagopa-dx/azure-function-app/azurerm"
  version = "~> 4.1"

  environment = local.environment

  resource_group_name = azurerm_resource_group.example.name
  health_check_path   = "/api/v1/info"
  node_version        = 20

  subnet_cidr                          = "10.50.246.0/24"
  subnet_pep_id                        = "<THE_PRIVATE_ENDPOINT_SUBNET_ID>"
  private_dns_zone_resource_group_name = "<THE_PRIVATE_DNS_ZONE_RESOURCE_GROUP_NAME>"
  virtual_network = {
    name                = "<THE_VIRTUAL_NETWORK_NAME>"
    resource_group_name = "<THE_VIRTUAL_NETWORK_RESOURCE_GROUP_NAME>"
  }

  app_settings      = {}
  slot_app_settings = {}

  tags = local.tags
}

module "roles" {
  source  = "pagopa-dx/azure-role-assignments/azurerm"
  version = "~> 1.4"

  principal_id    = module.function.function_app.function_app.principal_id
  subscription_id = data.azurerm_subscription.current.subscription_id

  application_insights = [
    {
      name                = azurerm_application_insights.this.name
      resource_group_name = azurerm_application_insights.this.resource_group_name
      description         = "Allow the Function App to publish custom metrics to Application Insights"
    }
  ]
}
