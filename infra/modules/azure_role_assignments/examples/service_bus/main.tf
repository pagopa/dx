resource "azurerm_resource_group" "example" {
  name     = "${local.resource_prefix}-rg-${local.environment.instance_number}"
  location = "Italy North"
}

data "azurerm_subnet" "pep" {
  name                 = "${local.project}-pep-snet-01"
  virtual_network_name = "${local.project}-common-vnet-01"
  resource_group_name  = "${local.project}-network-rg-01"
}

module "app_service_exposed" {
  source  = "pagopa-dx/azure-function-app-exposed/azurerm"
  version = "~> 5.0"

  environment = local.environment

  resource_group_name = azurerm_resource_group.example.name
  health_check_path   = "/api/v1/info"

  app_settings      = {}
  slot_app_settings = {}

  tags = local.tags
}

module "service_bus" {
  source  = "pagopa-dx/azure-service-bus-namespace/azurerm"
  version = "~> 2.0"

  environment         = local.environment
  resource_group_name = azurerm_resource_group.example.name

  subnet_pep_id                        = data.azurerm_subnet.pep.id
  private_dns_zone_resource_group_name = "${local.project}-network-rg-01"

  tags = local.tags
}

resource "azurerm_servicebus_queue" "example" {
  name         = "example-queue"
  namespace_id = module.service_bus.id
}

resource "azurerm_servicebus_topic" "example" {
  name         = "example-topic"
  namespace_id = module.service_bus.id
}

resource "azurerm_servicebus_topic" "example2" {
  name         = "example-topic2"
  namespace_id = module.service_bus.id
}

resource "azurerm_servicebus_subscription" "example" {
  name               = "example-sub"
  topic_id           = azurerm_servicebus_topic.example2.id
  max_delivery_count = 1
}

resource "azurerm_servicebus_subscription" "example2" {
  name               = "example-sub2"
  topic_id           = azurerm_servicebus_topic.example2.id
  max_delivery_count = 1
}

module "roles" {
  source  = "pagopa-dx/azure-role-assignments/azurerm"
  version = "~> 4.0"

  principal_id    = module.app_service_exposed.function_app.function_app.principal_id
  subscription_id = data.azurerm_subscription.current.subscription_id

  service_bus = [
    {
      namespace_name      = "dx-d-itn-playground-sb-01"
      resource_group_name = "dx-d-itn-test-rg-01"
      role                = "reader"
      description         = "This is a reader"
      queue_names         = [azurerm_servicebus_queue.example.name]
      topic_names         = [azurerm_servicebus_topic.example.name]
      subscriptions = {
        example-topic2 = [azurerm_servicebus_subscription.example.name, azurerm_servicebus_subscription.example2.name],
      }
    }
  ]
}
