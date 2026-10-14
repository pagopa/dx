resource "random_integer" "instance_number" {
  min = 10
  max = 99
}

resource "azurerm_resource_group" "e2e_blob_rbac" {
  name = provider::dx::resource_name({
    prefix          = local.environment.prefix
    environment     = local.environment.env_short
    location        = local.environment.location
    name            = "e2e"
    instance_number = local.environment.instance_number
    resource_type   = "resource_group"
  })
  location = local.environment.location

  tags = local.tags
}

#trivy:ignore:AZU-0012 Public access is required for the E2E container group probes.
#trivy:ignore:AZU-0057 This ephemeral fixture stores no production data.
#trivy:ignore:AZU-0058 LRS matches the low-cost development-tier test storage requirement.
#trivy:ignore:AZU-0060 Customer-managed keys are outside the RBAC merge scenarios.
#trivy:ignore:AZU-0061 Infrastructure encryption is not part of the E2E test contract.
resource "azurerm_storage_account" "e2e" {
  name                     = provider::dx::resource_name(merge(local.environment, { resource_type = "storage_account" }))
  resource_group_name      = azurerm_resource_group.e2e_blob_rbac.name
  location                 = local.environment.location
  account_kind             = "StorageV2"
  account_tier             = "Standard"
  account_replication_type = "LRS"

  public_network_access = "Enabled"

  tags = local.tags
}

resource "azurerm_storage_container" "probe" {
  name                  = local.container_name
  storage_account_id    = azurerm_storage_account.e2e.id
  container_access_type = "private"
}

resource "azurerm_user_assigned_identity" "limited_probe" {
  name                = "dx-e2e-blob-limited-mi-${local.environment.instance_number}"
  location            = local.environment.location
  resource_group_name = azurerm_resource_group.e2e_blob_rbac.name

  tags = local.tags
}

resource "azurerm_user_assigned_identity" "full_probe" {
  name                = "dx-e2e-blob-full-mi-${local.environment.instance_number}"
  location            = local.environment.location
  resource_group_name = azurerm_resource_group.e2e_blob_rbac.name

  tags = local.tags
}

resource "azurerm_container_group" "limited_app" {
  name                = "dx-e2e-blob-limited-aci-${local.environment.instance_number}"
  location            = local.environment.location
  resource_group_name = azurerm_resource_group.e2e_blob_rbac.name

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.limited_probe.id]
  }

  os_type         = "Linux"
  ip_address_type = "Public"

  container {
    name   = "blob-rbac-probe"
    image  = local.docker_image
    cpu    = "0.5"
    memory = "1.5"

    environment_variables = {
      AZURE_CLIENT_ID = azurerm_user_assigned_identity.limited_probe.client_id
    }

    ports {
      port = 8080
    }
  }

  tags = local.tags

  depends_on = [
    azurerm_storage_container.probe
  ]
}

resource "azurerm_container_group" "full_app" {
  name                = "dx-e2e-blob-full-aci-${local.environment.instance_number}"
  location            = local.environment.location
  resource_group_name = azurerm_resource_group.e2e_blob_rbac.name

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.full_probe.id]
  }

  os_type         = "Linux"
  ip_address_type = "Public"

  container {
    name   = "blob-rbac-probe"
    image  = local.docker_image
    cpu    = "0.5"
    memory = "1.5"

    environment_variables = {
      AZURE_CLIENT_ID = azurerm_user_assigned_identity.full_probe.client_id
    }

    ports {
      port = 8080
    }
  }

  tags = local.tags

  depends_on = [
    azurerm_storage_container.probe
  ]
}

resource "azurerm_role_definition" "source_blob_rw_without_delete" {
  name        = local.role_names.source_blob_rw_without_delete
  description = "Allows Blob data operations except delete so merge tests can validate not_data_actions preservation."
  scope       = azurerm_storage_account.e2e.id

  permissions {
    data_actions = ["Microsoft.Storage/storageAccounts/blobServices/containers/blobs/*"]
    not_data_actions = [
      "Microsoft.Storage/storageAccounts/blobServices/containers/blobs/delete",
    ]
  }

  assignable_scopes = [azurerm_storage_account.e2e.id]
}

resource "azurerm_role_definition" "source_blob_read_only" {
  name        = local.role_names.source_blob_read_only
  description = "Adds an explicit Blob read grant so the limited merged-role scenario still exercises a two-role merge without changing the effective permission set."
  scope       = azurerm_storage_account.e2e.id

  permissions {
    data_actions = ["Microsoft.Storage/storageAccounts/blobServices/containers/blobs/read"]
  }

  assignable_scopes = [azurerm_storage_account.e2e.id]
}

resource "azurerm_role_definition" "source_blob_delete_only" {
  name        = local.role_names.source_blob_delete_only
  description = "Allows only Blob delete so merge tests can verify delete is restored by a separate permission block."
  scope       = azurerm_storage_account.e2e.id

  permissions {
    data_actions = ["Microsoft.Storage/storageAccounts/blobServices/containers/blobs/delete"]
  }

  assignable_scopes = [azurerm_storage_account.e2e.id]
}

resource "azurerm_role_definition" "source_container_rw_without_delete" {
  name        = local.role_names.source_container_rw_without_delete
  description = "Allows blob container control-plane operations except delete so merge tests can validate not_actions preservation."
  scope       = azurerm_storage_account.e2e.id

  permissions {
    actions = ["Microsoft.Storage/storageAccounts/blobServices/containers/*"]
    not_actions = [
      "Microsoft.Storage/storageAccounts/blobServices/containers/delete",
    ]
  }

  assignable_scopes = [azurerm_storage_account.e2e.id]
}

resource "azurerm_role_definition" "source_container_read_only" {
  name        = local.role_names.source_container_read_only
  description = "Adds an explicit blob container control-plane read grant so the limited merged-role scenario still exercises a two-role merge without changing the effective permission set."
  scope       = azurerm_storage_account.e2e.id

  permissions {
    actions = ["Microsoft.Storage/storageAccounts/blobServices/containers/read"]
  }

  assignable_scopes = [azurerm_storage_account.e2e.id]
}

resource "azurerm_role_definition" "source_container_delete_only" {
  name        = local.role_names.source_container_delete_only
  description = "Allows only blob container control-plane delete so merge tests can verify delete is restored by a separate permission block."
  scope       = azurerm_storage_account.e2e.id

  permissions {
    actions = ["Microsoft.Storage/storageAccounts/blobServices/containers/delete"]
  }

  assignable_scopes = [azurerm_storage_account.e2e.id]
}

resource "azurerm_role_assignment" "limited_probe" {
  scope              = azurerm_storage_account.e2e.id
  role_definition_id = module.blob_rw_without_delete.custom_role_id
  principal_id       = azurerm_user_assigned_identity.limited_probe.principal_id
}

resource "azurerm_role_assignment" "full_probe" {
  scope              = azurerm_storage_account.e2e.id
  role_definition_id = module.blob_rw_with_delete_restored.custom_role_id
  principal_id       = azurerm_user_assigned_identity.full_probe.principal_id
}

resource "azurerm_role_assignment" "limited_probe_control_plane" {
  scope              = azurerm_storage_account.e2e.id
  role_definition_id = module.container_rw_without_delete.custom_role_id
  principal_id       = azurerm_user_assigned_identity.limited_probe.principal_id
}

resource "azurerm_role_assignment" "full_probe_control_plane" {
  scope              = azurerm_storage_account.e2e.id
  role_definition_id = module.container_rw_with_delete_restored.custom_role_id
  principal_id       = azurerm_user_assigned_identity.full_probe.principal_id
}
