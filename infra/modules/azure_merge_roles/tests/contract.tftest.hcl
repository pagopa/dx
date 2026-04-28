# Contract tests for azure_merge_roles.
# Validates input constraints.

variables {
  scope        = "/subscriptions/00000000-0000-0000-0000-000000000000"
  role_name    = "dx-observability-reader"
  reason       = "Grant observability read access without duplicating role assignments"
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
    ]
  }
}

override_data {
  target = data.azurerm_role_definition.source["1"]
  values = {
    permissions = [
      {
        actions          = ["Microsoft.Insights/*/read"]
        data_actions     = []
        not_actions      = []
        not_data_actions = []
      },
    ]
  }
}

run "scope_must_be_an_arm_scope" {
  command = plan

  variables {
    scope = "subscriptions/00000000-0000-0000-0000-000000000000"
  }

  expect_failures = [var.scope]
}

run "management_group_scope_is_supported" {
  command = plan

  variables {
    scope = "/providers/Microsoft.Management/managementGroups/dx-platform"
  }
}

run "role_name_must_not_be_empty" {
  command = plan

  variables {
    role_name = "   "
  }

  expect_failures = [var.role_name]
}

run "source_roles_must_not_be_empty" {
  command = plan

  variables {
    source_roles = []
  }

  expect_failures = [var.source_roles]
}

run "source_roles_must_contain_at_least_two_roles" {
  command = plan

  variables {
    source_roles = ["Reader"]
  }

  expect_failures = [var.source_roles]
}

run "source_roles_must_not_contain_duplicates" {
  command = plan

  variables {
    source_roles = ["Reader", "Reader"]
  }

  expect_failures = [var.source_roles]
}

run "reason_must_not_be_blank" {
  command = plan

  variables {
    reason = "  "
  }

  expect_failures = [var.reason]
}
