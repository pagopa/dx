data "azurerm_monitor_action_group" "example" {
  name                = replace("${local.environment.prefix}-${local.environment.env_short}-error", "-", "")
  resource_group_name = "${local.environment.prefix}-${local.environment.env_short}-rg-common"
}

resource "azurerm_resource_group" "example" {
  name     = "${local.project}-${local.environment.domain}-rg-${local.environment.instance_number}"
  location = local.environment.location
}

data "azurerm_subnet" "pep" {
  name                 = "${local.project}-pep-snet-01"
  virtual_network_name = "${local.project}-common-vnet-01"
  resource_group_name  = "${local.project}-common-rg-01"
}

module "azure_event_hub" {
  source = "../../"

  environment         = local.environment
  resource_group_name = azurerm_resource_group.example.name
  tier                = "l"

  subnet_pep_id = data.azurerm_subnet.pep.id

  action_group_id = data.azurerm_monitor_action_group.example.id

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