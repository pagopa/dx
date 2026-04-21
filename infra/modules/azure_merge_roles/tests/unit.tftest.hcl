# Unit tests for azure_merge_roles.
# Uses mocked role definitions to validate role construction without real Azure calls.

variables {
  scope        = "/subscriptions/00000000-0000-0000-0000-000000000000"
  role_name    = "dx-observability-reader"
  source_roles = ["Reader", "Monitoring Reader"]
}

mock_provider "azurerm" {}

override_data {
  target = data.azurerm_role_definition.source["Reader"]
  values = {
    permissions = [
      {
        actions          = ["*/read"]
        data_actions     = []
        not_actions      = []
        not_data_actions = []
      },
      {
        actions          = ["Microsoft.Support/*"]
        data_actions     = []
        not_actions      = []
        not_data_actions = []
      },
    ]
  }
}

override_data {
  target = data.azurerm_role_definition.source["Monitoring Reader"]
  values = {
    permissions = [
      {
        actions          = ["Microsoft.Insights/*/read"]
        data_actions     = ["Microsoft.Storage/storageAccounts/blobServices/containers/blobs/read"]
        not_actions      = []
        not_data_actions = []
      },
    ]
  }
}

run "merge_roles_preserves_all_distinct_permission_blocks" {
  command = plan

  assert {
    condition     = length(local.permission_blocks) == 3
    error_message = "permission_blocks must preserve all distinct permission blocks from source roles"
  }

  assert {
    condition = contains([
      for permission in local.permission_blocks : jsonencode(permission)
      ], jsonencode({
        actions          = ["*/read"]
        data_actions     = []
        not_actions      = []
        not_data_actions = []
    }))
    error_message = "permission_blocks must preserve the Reader read-only block"
  }

  assert {
    condition = contains([
      for permission in local.permission_blocks : jsonencode(permission)
      ], jsonencode({
        actions          = ["Microsoft.Support/*"]
        data_actions     = []
        not_actions      = []
        not_data_actions = []
    }))
    error_message = "permission_blocks must preserve the Reader support block"
  }

  assert {
    condition = contains([
      for permission in local.permission_blocks : jsonencode(permission)
      ], jsonencode({
        actions          = ["Microsoft.Insights/*/read"]
        data_actions     = ["Microsoft.Storage/storageAccounts/blobServices/containers/blobs/read"]
        not_actions      = []
        not_data_actions = []
    }))
    error_message = "permission_blocks must preserve the Monitoring Reader block"
  }
}

run "assignable_scopes_default_to_scope" {
  command = plan

  assert {
    condition     = length(local.assignable_scopes) == 1 && local.assignable_scopes[0] == "/subscriptions/00000000-0000-0000-0000-000000000000"
    error_message = "assignable_scopes must default to [scope]"
  }

  assert {
    condition     = local.merged_description == "Merged role from: Monitoring Reader, Reader"
    error_message = "default description must be derived from source_roles"
  }
}

run "custom_description_and_assignable_scopes_are_applied" {
  command = plan

  variables {
    description = "Custom role for observability read access"
    assignable_scopes = [
      "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-observability",
      "/subscriptions/00000000-0000-0000-0000-000000000000",
    ]
  }

  assert {
    condition = jsonencode(local.assignable_scopes) == jsonencode([
      "/subscriptions/00000000-0000-0000-0000-000000000000",
      "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-observability",
    ])
    error_message = "assignable_scopes must preserve the provided scopes after deduplication and sorting"
  }

  assert {
    condition     = local.merged_description == "Custom role for observability read access"
    error_message = "description must use the caller-provided value when present"
  }
}

run "merge_roles_preserves_exclusions_per_permission_block" {
  command = plan

  override_data {
    target = data.azurerm_role_definition.source["Reader"]
    values = {
      permissions = [
        {
          actions          = ["Microsoft.Authorization/*"]
          data_actions     = ["Microsoft.Storage/storageAccounts/blobServices/containers/blobs/*"]
          not_actions      = ["Microsoft.Authorization/roleAssignments/delete"]
          not_data_actions = ["Microsoft.Storage/storageAccounts/blobServices/containers/blobs/delete"]
        },
      ]
    }
  }

  override_data {
    target = data.azurerm_role_definition.source["Monitoring Reader"]
    values = {
      permissions = [
        {
          actions          = ["Microsoft.Authorization/roleAssignments/delete"]
          data_actions     = ["Microsoft.Storage/storageAccounts/blobServices/containers/blobs/delete"]
          not_actions      = []
          not_data_actions = []
        },
      ]
    }
  }

  assert {
    condition     = length(local.permission_blocks) == 2
    error_message = "permission_blocks must keep separate blocks when exclusions are involved"
  }

  assert {
    condition = contains([
      for permission in local.permission_blocks : jsonencode(permission)
      ], jsonencode({
        actions          = ["Microsoft.Authorization/*"]
        data_actions     = ["Microsoft.Storage/storageAccounts/blobServices/containers/blobs/*"]
        not_actions      = ["Microsoft.Authorization/roleAssignments/delete"]
        not_data_actions = ["Microsoft.Storage/storageAccounts/blobServices/containers/blobs/delete"]
    }))
    error_message = "permission_blocks must preserve not_actions and not_data_actions from source roles"
  }

  assert {
    condition = contains([
      for permission in local.permission_blocks : jsonencode(permission)
      ], jsonencode({
        actions          = ["Microsoft.Authorization/roleAssignments/delete"]
        data_actions     = ["Microsoft.Storage/storageAccounts/blobServices/containers/blobs/delete"]
        not_actions      = []
        not_data_actions = []
    }))
    error_message = "permission_blocks must preserve explicit actions and data actions from other source roles"
  }

  assert {
    condition     = length(azurerm_role_definition.merged.permissions) == 2
    error_message = "the merged custom role must emit one permissions block per preserved source block"
  }
}
