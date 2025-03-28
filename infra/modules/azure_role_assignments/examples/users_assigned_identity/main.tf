resource "azurerm_user_assigned_identity" "id" {
  location            = data.azurerm_resource_group.dx_identity.location
  resource_group_name = data.azurerm_resource_group.dx_identity.name
  name                = "${local.project}-id-${local.environment.instance_number}"
}


module "roles" {
  source = "../../"

  principal_id    = azurerm_user_assigned_identity.id.principal_id
  subscription_id = data.azurerm_subscription.current.subscription_id

  storage_table = [
    {
      storage_account_name = "<THE_STORAGE_ACCOUNT_NAME>"
      resource_group_name  = "<THE_STORAGE_ACCOUNT_RESOURCE_GROUP_NAME>"
      table_name           = "test-table"
      role                 = "reader"
      description          = "Why this role is assigned"
    },
    {
      storage_account_name = "<THE_STORAGE_ACCOUNT_NAME>"
      resource_group_name  = "<THE_STORAGE_ACCOUNT_RESOURCE_GROUP_NAME>"
      role                 = "writer"
      description          = "Why this role is assigned"
    }
  ]

  storage_blob = [
    {
      storage_account_name = "<THE_STORAGE_ACCOUNT_NAME>"
      resource_group_name  = "<THE_STORAGE_ACCOUNT_RESOURCE_GROUP_NAME>"
      container_name       = "images"
      role                 = "reader"
      description          = "Why this role is assigned"
    }
  ]

  storage_queue = [
    {
      storage_account_name = "<THE_STORAGE_ACCOUNT_NAME>"
      resource_group_name  = "<THE_STORAGE_ACCOUNT_RESOURCE_GROUP_NAME>"
      queue_name           = "myqueue"
      role                 = "writer"
      description          = "Why this role is assigned"
    }
  ]
}
