# Module Under Test — the azure_storage_account module being demonstrated.
# Supporting infrastructure is defined in fixtures.tf.

module "azure_storage_account" {
  source  = "pagopa-dx/azure-storage-account/azurerm"
  version = "~> 2.1"

  environment         = local.environment
  use_case            = "default"
  resource_group_name = azurerm_resource_group.example.name

  subnet_pep_id                        = data.azurerm_subnet.pep.id
  private_dns_zone_resource_group_name = local.virtual_network.resource_group_name

  customer_managed_key = {
    enabled = true
    # type         = "kv"
    # key_vault_id = "your-kv-id"
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

  static_website = {
    enabled            = true
    index_document     = "index.html"
    error_404_document = "404.html"
  }

  custom_domain = {
    name          = "example.com"
    use_subdomain = true
  }

  containers = [
    {
      name        = "container1"
      access_type = "private"
    },
    {
      name        = "container2"
      access_type = "private"
    }
  ]

  tables = [
    "table1",
    "table2"
  ]

  queues = [
    "queue1",
    "queue2"
  ]

  tags = local.tags
}
