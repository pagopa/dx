resource "azurerm_user_assigned_identity" "id" {
  location            = data.azurerm_resource_group.dx_identity.location
  resource_group_name = data.azurerm_resource_group.dx_identity.name
  name                = "${local.project}-id-${local.environment.instance_number}"
}


module "roles" {
  source       = "../../"
  principal_id = azurerm_user_assigned_identity.id.principal_id

  storage_table = [
    {
      storage_account_id = "<THE_STORAGE_ACCOUNT_ID>"
      table_name         = "test-table"
      role               = "reader"
    },
    {
      storage_account_id = "<THE_STORAGE_ACCOUNT_ID>"
      role               = "writer"
    }
  ]

  storage_blob = [
    {
      storage_account_id = "<THE_STORAGE_ACCOUNT_ID>"
      container_name     = "images"
      role               = "reader"
    }
  ]

  storage_queue = [
    {
      storage_account_id = "<THE_STORAGE_ACCOUNT_ID>"
      queue_name         = "myqueue"
      role               = "writer"
    }
  ]
}