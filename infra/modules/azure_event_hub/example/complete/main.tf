resource "azurerm_resource_group" "example" {
  name     = provider::dx::resource_name(merge(local.naming_config, { resource_type = "resource_group" }))
  location = local.environment.location
}

data "azurerm_subnet" "pep" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    name          = "pep",
    resource_type = "subnet"
  }))
  virtual_network_name = local.virtual_network.name
  resource_group_name  = local.virtual_network.resource_group_name
}

resource "azurerm_subnet" "example" {
  name                 = "example-subnet"
  virtual_network_name = local.virtual_network.name
  resource_group_name  = local.virtual_network.resource_group_name
  address_prefixes     = ["10.0.1.0/24"]
}

module "azure_event_hub" {
  source = "../../"

  environment         = local.environment
  resource_group_name = azurerm_resource_group.example.name
  tier                = "l"

  subnet_pep_id                        = data.azurerm_subnet.pep.id
  private_dns_zone_resource_group_name = local.virtual_network.resource_group_name

  allowed_sources = {
    subnet_ids = [azurerm_subnet.example.id]
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