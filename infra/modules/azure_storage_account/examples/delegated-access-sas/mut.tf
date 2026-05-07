# Module Under Test - the local azure_storage_account module configured for user delegation SAS access.

module "storage_account" {
  source = "../.."

  environment         = local.environment
  resource_group_name = azurerm_resource_group.this.name

  # This profile disables shared keys and keeps the Blob endpoint publicly reachable,
  # so clients must authenticate with Entra ID first and then use a user delegation SAS.
  use_case = "delegated_access"

  containers = [
    {
      name        = local.container_name
      access_type = "private"
    }
  ]

  subservices_enabled = {
    blob  = true
    file  = false
    queue = false
    table = false
  }

  tags = local.tags
}