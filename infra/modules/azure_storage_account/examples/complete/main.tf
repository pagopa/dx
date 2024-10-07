data "azurerm_subnet" "pep" {
  name                 = "${local.project}-pep-snet-01"
  virtual_network_name = "${local.project}-common-vnet-01"
  resource_group_name  = "${local.project}-common-rg-01"
}

data "azurerm_monitor_action_group" "example" {
  name                = replace("${local.environment.prefix}-${local.environment.env_short}-error", "-", "")
  resource_group_name = "${local.environment.prefix}-${local.environment.env_short}-rg-common"
}

resource "azurerm_resource_group" "example" {
  name     = "${local.project}-${local.environment.domain}-rg-${local.environment.instance_number}"
  location = local.environment.location
}

resource "azurerm_subnet" "example" {
  name                 = "example-subnet"
  virtual_network_name = "${local.project}-common-vnet-01"
  resource_group_name  = "${local.project}-common-rg-01"
  address_prefixes     = ["10.0.1.0/24"]
}

resource "azurerm_user_assigned_identity" "example" {
  name                = "example"
  resource_group_name = azurerm_resource_group.example.name
  location            = local.environment.location
}

module "azure_storage_account" {
  source = "../../"

  environment         = local.environment
  tier                = "l"
  resource_group_name = azurerm_resource_group.example.name

  subnet_pep_id                        = data.azurerm_subnet.pep.id
  private_dns_zone_resource_group_name = "${local.environment.prefix}-${local.environment.env_short}-rg-common"

  customer_managed_key = {
    enabled                   = true
    type                      = "kv"
    user_assigned_identity_id = azurerm_user_assigned_identity.example.id
    key_vault_key_id          = "your-key-vault-key-id"
  }

  blob_features = {
    immutability_policy = {
      enabled                       = true
      allow_protected_append_writes = true
      period_since_creation_in_days = 730
    }
    # restore_policy_days   = 30 # Cannot enable both immutability_policy and restore_policy
    delete_retention_days = 14
    versioning            = true
    last_access_time      = true
    change_feed = {
      enabled           = true
      retention_in_days = 30
    }
  }

  force_public_network_access_enabled = false

  access_tier = "Hot"

  subservices_enabled = {
    blob  = true
    file  = true
    queue = true
    table = true
  }

  network_rules = {
    default_action             = "Deny"
    bypass                     = ["AzureServices"]
    ip_rules                   = ["203.0.113.0/24"]
    virtual_network_subnet_ids = [azurerm_subnet.example.id]
  }

  action_group_id = data.azurerm_monitor_action_group.example.id

  static_website = {
    enabled            = true
    index_document     = "index.html"
    error_404_document = "404.html"
  }

  custom_domain = {
    name          = "example.com"
    use_subdomain = true
  }

  tags = local.tags
}
