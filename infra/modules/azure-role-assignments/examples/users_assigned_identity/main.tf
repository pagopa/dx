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
      storage_account_name = "test"
      resource_group_name  = "test-rg"
      table_name           = "test-table"
      role                 = "reader"
    },
    {
      storage_account_name = "test2"
      resource_group_name  = "test-rg"
      role                 = "writer"
    }
  ]

  storage_blob = [
    {
      storage_account_name = "test"
      resource_group_name  = "test-rg"
      container_name       = "images"
      role                 = "reader"
    }
  ]

  storage_queue = [
    {
      storage_account_name = "test"
      resource_group_name  = "test-rg"
      queue_name           = "myqueue"
      role                 = "writer"
    }
  ]
}