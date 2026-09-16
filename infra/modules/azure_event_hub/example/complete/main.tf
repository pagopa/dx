resource "azurerm_resource_group" "example" {
  name     = provider::dx::resource_name(merge(local.environment, { resource_type = "resource_group" }))
  location = local.environment.location
}

data "azurerm_virtual_network" "vnet" {
  name                = local.virtual_network.name
  resource_group_name = local.virtual_network.resource_group_name
}

data "azurerm_subnet" "pep" {
  name = provider::dx::resource_name(merge(local.environment, {
    app_name      = "pep",
    domain        = ""
    resource_type = "subnet"
  }))
  virtual_network_name = local.virtual_network.name
  resource_group_name  = local.virtual_network.resource_group_name
}

resource "dx_available_subnet_cidr" "allowed" {
  virtual_network_id = data.azurerm_virtual_network.vnet.id
  prefix_length      = 29
}

resource "azurerm_subnet" "allowed" {
  name = provider::dx::resource_name(merge(local.environment, {
    app_name      = "allowed",
    resource_type = "subnet"
  }))
  virtual_network_name = local.virtual_network.name
  resource_group_name  = local.virtual_network.resource_group_name
  address_prefixes     = [dx_available_subnet_cidr.allowed.cidr_block]

  service_endpoints = ["Microsoft.EventHub"]
}

module "azure_event_hub" {
  source  = "pagopa-dx/azure-event-hub/azurerm"
  version = "~> 2.0"

  environment         = local.environment
  resource_group_name = azurerm_resource_group.example.name
  use_case            = "default"

  subnet_pep_id                        = data.azurerm_subnet.pep.id
  private_dns_zone_resource_group_name = local.virtual_network.resource_group_name

  allowed_sources = {
    subnet_ids = [azurerm_subnet.allowed.id]
    ips        = []
  }

  eventhubs = [{
    name                   = "event-hub-test"
    partitions             = 1
    message_retention_days = 1
    consumers = [
      "test-consumer-group-1",
      "test-consumer-group-2",
    ]
    keys = [
      {
        name   = "test-connector-1"
        listen = false
        send   = true
        manage = false
      },
      {
        name   = "test-connector-2"
        listen = true
        send   = false
        manage = false
      },
    ]
  }]

  tags = local.tags
}
