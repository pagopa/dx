# Unit tests for azure_merge_roles.
# Uses mocked role definitions to validate role construction without real Azure calls.

variables {
  scope        = "/subscriptions/00000000-0000-0000-0000-000000000000"
  role_name    = "dx-observability-reader"
  source_roles = ["Reader", "Monitoring Reader"]
}

mock_provider "azurerm" {}

override_data {
  target = data.azurerm_role_definition.source["0"]
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
  target = data.azurerm_role_definition.source["1"]
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

run "merge_roles_flattens_source_permissions_into_one_effective_block" {
  command = plan

  assert {
    condition     = length(azurerm_role_definition.merged.permissions) == 1
    error_message = "the merged custom role must emit a single permissions block because Azure custom roles do not accept multiple permission objects"
  }

  assert {
    condition = jsonencode(local.merged_permissions.actions) == jsonencode([
      "*/read",
      "Microsoft.Insights/*/read",
      "Microsoft.Support/*",
    ])
    error_message = "merged_permissions.actions must contain the union of all source control-plane actions"
  }

  assert {
    condition = jsonencode(local.merged_permissions.data_actions) == jsonencode([
      "Microsoft.Storage/storageAccounts/blobServices/containers/blobs/read",
    ])
    error_message = "merged_permissions.data_actions must contain the union of all source data-plane actions"
  }

  assert {
    condition     = jsonencode(local.merged_permissions.not_actions) == jsonencode([])
    error_message = "merged_permissions.not_actions must be empty when no source role defines control-plane exclusions"
  }

  assert {
    condition     = jsonencode(local.merged_permissions.not_data_actions) == jsonencode([])
    error_message = "merged_permissions.not_data_actions must be empty when no source role defines data-plane exclusions"
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

run "merge_roles_preserves_unoverridden_exclusions" {
  command = plan

  override_data {
    target = data.azurerm_role_definition.source["0"]
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
    target = data.azurerm_role_definition.source["1"]
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

  assert {
    condition = jsonencode(local.merged_permissions.not_actions) == jsonencode([
      "Microsoft.Authorization/roleAssignments/delete",
    ])
    error_message = "merged_permissions.not_actions must preserve exclusions that are not granted by another source role"
  }

  assert {
    condition = jsonencode(local.merged_permissions.not_data_actions) == jsonencode([
      "Microsoft.Storage/storageAccounts/blobServices/containers/blobs/delete",
    ])
    error_message = "merged_permissions.not_data_actions must preserve exclusions that are not granted by another source role"
  }

  assert {
    condition     = length(azurerm_role_definition.merged.permissions) == 1
    error_message = "the merged custom role must still render one permissions block when exclusions are preserved"
  }
}

run "merge_roles_drops_exclusions_regranted_by_other_source_roles" {
  command = plan

  override_data {
    target = data.azurerm_role_definition.source["0"]
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
    target = data.azurerm_role_definition.source["1"]
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
    condition     = jsonencode(local.merged_permissions.not_actions) == jsonencode([])
    error_message = "merged_permissions.not_actions must drop exclusions that another source role grants without excluding"
  }

  assert {
    condition     = jsonencode(local.merged_permissions.not_data_actions) == jsonencode([])
    error_message = "merged_permissions.not_data_actions must drop exclusions that another source role grants without excluding"
  }

  assert {
    condition     = contains(local.merged_permissions.data_actions, "Microsoft.Storage/storageAccounts/blobServices/containers/blobs/delete")
    error_message = "merged_permissions.data_actions must retain explicitly re-granted data actions"
  }

  assert {
    condition     = length(azurerm_role_definition.merged.permissions) == 1
    error_message = "the merged custom role must still emit a single permissions block when exclusions are re-granted"
  }
}

# The remaining cases document the repository policy for wildcard-heavy merges:
# when Azure's single permissions block cannot model overlaps precisely,
# permissivity wins over preserving a possibly too-restrictive exclusion.

run "merge_roles_drops_exact_exclusions_regranted_by_wildcards" {
  command = plan

  override_data {
    target = data.azurerm_role_definition.source["0"]
    values = {
      permissions = [
        {
          actions          = ["Microsoft.Authorization/roleAssignments/*"]
          data_actions     = ["Microsoft.Storage/storageAccounts/blobServices/containers/blobs/*"]
          not_actions      = ["Microsoft.Authorization/roleAssignments/delete"]
          not_data_actions = ["Microsoft.Storage/storageAccounts/blobServices/containers/blobs/delete"]
        },
      ]
    }
  }

  override_data {
    target = data.azurerm_role_definition.source["1"]
    values = {
      permissions = [
        {
          actions          = ["Microsoft.Authorization/roleAssignments/*"]
          data_actions     = ["Microsoft.Storage/storageAccounts/blobServices/containers/blobs/*"]
          not_actions      = []
          not_data_actions = []
        },
      ]
    }
  }

  assert {
    condition     = jsonencode(local.merged_permissions.not_actions) == jsonencode([])
    error_message = "merged_permissions.not_actions must drop exact exclusions when another source role re-grants them through a wildcard action"
  }

  assert {
    condition     = jsonencode(local.merged_permissions.not_data_actions) == jsonencode([])
    error_message = "merged_permissions.not_data_actions must drop exact exclusions when another source role re-grants them through a wildcard data action"
  }

  assert {
    condition     = contains(local.merged_permissions.actions, "Microsoft.Authorization/roleAssignments/*")
    error_message = "merged_permissions.actions must retain the wildcard action that re-grants the excluded control-plane permission"
  }

  assert {
    condition     = contains(local.merged_permissions.data_actions, "Microsoft.Storage/storageAccounts/blobServices/containers/blobs/*")
    error_message = "merged_permissions.data_actions must retain the wildcard action that re-grants the excluded data-plane permission"
  }
}

run "merge_roles_drops_wildcard_exclusions_when_exact_subset_is_regranted" {
  command = plan

  override_data {
    target = data.azurerm_role_definition.source["0"]
    values = {
      permissions = [
        {
          actions          = ["Microsoft.Authorization/roleAssignments/*"]
          data_actions     = ["Microsoft.Storage/storageAccounts/blobServices/containers/blobs/*"]
          not_actions      = ["Microsoft.Authorization/roleAssignments/*"]
          not_data_actions = ["Microsoft.Storage/storageAccounts/blobServices/containers/blobs/*"]
        },
      ]
    }
  }

  override_data {
    target = data.azurerm_role_definition.source["1"]
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
    condition     = jsonencode(local.merged_permissions.not_actions) == jsonencode([])
    error_message = "merged_permissions.not_actions must drop wildcard exclusions when another source role re-grants an exact control-plane subset"
  }

  assert {
    condition     = jsonencode(local.merged_permissions.not_data_actions) == jsonencode([])
    error_message = "merged_permissions.not_data_actions must drop wildcard exclusions when another source role re-grants an exact data-plane subset"
  }

  assert {
    condition     = contains(local.merged_permissions.actions, "Microsoft.Authorization/roleAssignments/delete")
    error_message = "merged_permissions.actions must retain the exact control-plane action that triggered the permissive wildcard override"
  }

  assert {
    condition     = contains(local.merged_permissions.data_actions, "Microsoft.Storage/storageAccounts/blobServices/containers/blobs/delete")
    error_message = "merged_permissions.data_actions must retain the exact data-plane action that triggered the permissive wildcard override"
  }
}

run "merge_roles_drops_wildcard_exclusions_when_narrower_wildcards_are_regranted" {
  command = plan

  override_data {
    target = data.azurerm_role_definition.source["0"]
    values = {
      permissions = [
        {
          actions          = ["Microsoft.Authorization/roleAssignments/*"]
          data_actions     = ["Microsoft.Storage/storageAccounts/blobServices/containers/blobs/*"]
          not_actions      = ["Microsoft.Authorization/roleAssignments/*"]
          not_data_actions = ["Microsoft.Storage/storageAccounts/blobServices/containers/blobs/*"]
        },
      ]
    }
  }

  override_data {
    target = data.azurerm_role_definition.source["1"]
    values = {
      permissions = [
        {
          actions          = ["Microsoft.Authorization/roleAssignments/del*"]
          data_actions     = ["Microsoft.Storage/storageAccounts/blobServices/containers/blobs/del*"]
          not_actions      = []
          not_data_actions = []
        },
      ]
    }
  }

  assert {
    condition     = jsonencode(local.merged_permissions.not_actions) == jsonencode([])
    error_message = "merged_permissions.not_actions must drop wildcard exclusions when another source role re-grants a narrower control-plane wildcard subset"
  }

  assert {
    condition     = jsonencode(local.merged_permissions.not_data_actions) == jsonencode([])
    error_message = "merged_permissions.not_data_actions must drop wildcard exclusions when another source role re-grants a narrower data-plane wildcard subset"
  }

  assert {
    condition     = contains(local.merged_permissions.actions, "Microsoft.Authorization/roleAssignments/del*")
    error_message = "merged_permissions.actions must retain the narrower control-plane wildcard that triggered the permissive override"
  }

  assert {
    condition     = contains(local.merged_permissions.data_actions, "Microsoft.Storage/storageAccounts/blobServices/containers/blobs/del*")
    error_message = "merged_permissions.data_actions must retain the narrower data-plane wildcard that triggered the permissive override"
  }
}

run "merge_roles_drops_wildcard_exclusions_for_partial_wildcard_overlap" {
  command = plan

  override_data {
    target = data.azurerm_role_definition.source["0"]
    values = {
      permissions = [
        {
          actions          = ["Microsoft.Authorization/*/delete"]
          data_actions     = ["Microsoft.Storage/*/delete"]
          not_actions      = ["Microsoft.Authorization/*/delete"]
          not_data_actions = ["Microsoft.Storage/*/delete"]
        },
      ]
    }
  }

  override_data {
    target = data.azurerm_role_definition.source["1"]
    values = {
      permissions = [
        {
          actions          = ["Microsoft.Authorization/roleAssignments/*"]
          data_actions     = ["Microsoft.Storage/storageAccounts/*"]
          not_actions      = []
          not_data_actions = []
        },
      ]
    }
  }

  assert {
    condition     = jsonencode(local.merged_permissions.not_actions) == jsonencode([])
    error_message = "merged_permissions.not_actions must drop wildcard exclusions when another source role partially overlaps through a different wildcard branch"
  }

  assert {
    condition     = jsonencode(local.merged_permissions.not_data_actions) == jsonencode([])
    error_message = "merged_permissions.not_data_actions must drop wildcard exclusions when another source role partially overlaps through a different wildcard branch"
  }
}

run "merge_roles_drops_wildcard_exclusions_even_when_overlap_block_reexcludes_subset" {
  command = plan

  override_data {
    target = data.azurerm_role_definition.source["0"]
    values = {
      permissions = [
        {
          actions          = ["Microsoft.Authorization/*/delete"]
          data_actions     = ["Microsoft.Storage/*/delete"]
          not_actions      = ["Microsoft.Authorization/*/delete"]
          not_data_actions = ["Microsoft.Storage/*/delete"]
        },
      ]
    }
  }

  override_data {
    target = data.azurerm_role_definition.source["1"]
    values = {
      permissions = [
        {
          actions          = ["Microsoft.Authorization/roleAssignments/*"]
          data_actions     = ["Microsoft.Storage/storageAccounts/*"]
          not_actions      = ["Microsoft.Authorization/roleAssignments/delete"]
          not_data_actions = ["Microsoft.Storage/storageAccounts/delete"]
        },
      ]
    }
  }

  assert {
    condition     = jsonencode(local.merged_permissions.not_actions) == jsonencode([])
    error_message = "merged_permissions.not_actions must still drop the broader wildcard exclusion even when the overlapping source role re-excludes a narrower subset"
  }

  assert {
    condition     = jsonencode(local.merged_permissions.not_data_actions) == jsonencode([])
    error_message = "merged_permissions.not_data_actions must still drop the broader wildcard exclusion even when the overlapping source role re-excludes a narrower subset"
  }
}

run "merge_roles_drops_all_overlapping_exclusions_when_permissivity_wins" {
  command = plan

  override_data {
    target = data.azurerm_role_definition.source["0"]
    values = {
      permissions = [
        {
          actions          = ["Microsoft.Authorization/*"]
          data_actions     = ["Microsoft.Storage/*"]
          not_actions      = ["Microsoft.Authorization/*/delete", "Microsoft.Authorization/roleAssignments/*"]
          not_data_actions = ["Microsoft.Storage/*/delete", "Microsoft.Storage/storageAccounts/*"]
        },
      ]
    }
  }

  override_data {
    target = data.azurerm_role_definition.source["1"]
    values = {
      permissions = [
        {
          actions          = ["Microsoft.Authorization/roleAssignments/delete"]
          data_actions     = ["Microsoft.Storage/storageAccounts/delete"]
          not_actions      = []
          not_data_actions = []
        },
      ]
    }
  }

  assert {
    condition     = jsonencode(local.merged_permissions.not_actions) == jsonencode([])
    error_message = "merged_permissions.not_actions must drop every overlapping exclusion when the policy prefers permissivity"
  }

  assert {
    condition     = jsonencode(local.merged_permissions.not_data_actions) == jsonencode([])
    error_message = "merged_permissions.not_data_actions must drop every overlapping exclusion when the policy prefers permissivity"
  }
}

run "merge_roles_drops_wildcard_exclusions_for_ambiguous_multisegment_overlap" {
  command = plan

  override_data {
    target = data.azurerm_role_definition.source["0"]
    values = {
      permissions = [
        {
          actions          = ["service/*/delete"]
          data_actions     = ["data/*/delete"]
          not_actions      = ["service/*/delete"]
          not_data_actions = ["data/*/delete"]
        },
      ]
    }
  }

  override_data {
    target = data.azurerm_role_definition.source["1"]
    values = {
      permissions = [
        {
          actions          = ["service/resource/*/action"]
          data_actions     = ["data/resource/*/action"]
          not_actions      = []
          not_data_actions = []
        },
      ]
    }
  }

  assert {
    condition     = jsonencode(local.merged_permissions.not_actions) == jsonencode([])
    error_message = "merged_permissions.not_actions must drop wildcard exclusions for ambiguous multisegment overlaps when permissivity wins"
  }

  assert {
    condition     = jsonencode(local.merged_permissions.not_data_actions) == jsonencode([])
    error_message = "merged_permissions.not_data_actions must drop wildcard exclusions for ambiguous multisegment overlaps when permissivity wins"
  }
}
