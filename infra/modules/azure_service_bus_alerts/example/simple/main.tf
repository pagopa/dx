resource "azurerm_resource_group" "example" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    name          = "example",
    resource_type = "resource_group"
  }))
  location = local.environment.location

  tags = local.tags
}

resource "azurerm_monitor_action_group" "dx" {
  name                = "dx-d-itn-test-ag-01"
  short_name          = "test-ag"
  resource_group_name = azurerm_resource_group.example.name

  tags = local.tags
}

resource "azurerm_servicebus_namespace" "example" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    name          = "example",
    resource_type = "servicebus_namespace"
  }))
  location            = local.environment.location
  resource_group_name = azurerm_resource_group.example.name
  sku                 = "Standard"
  tags                = local.tags
}

resource "azurerm_servicebus_queue" "example" {
  name         = "my-queue"
  namespace_id = azurerm_servicebus_namespace.example.id
}

resource "azurerm_servicebus_topic" "example" {
  name         = "my-topic"
  namespace_id = azurerm_servicebus_namespace.example.id
}

module "sbns_alert" {
  source  = "pagopa-dx/azure-service-bus-alerts/azurerm"
  version = "~> 3.0"

  environment = local.environment

  alerts_on_active_messages = {
    entity_names = [
      azurerm_servicebus_queue.example.name,
      azurerm_servicebus_topic.example.name
    ]
    description = "A test alert"
  }

  service_bus_namespace_id = azurerm_servicebus_namespace.example.id

  action_group_ids = [azurerm_monitor_action_group.dx.id]

  tags = local.tags
}
