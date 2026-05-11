mock_provider "azurerm" {}

override_data {
  target = data.azurerm_subscription.current
  values = {
    id              = "/subscriptions/00000000-0000-0000-0000-000000000000"
    subscription_id = "00000000-0000-0000-0000-000000000000"
    display_name    = "DX Current"
  }
}

run "uses_current_provider_subscription_when_inputs_are_omitted" {
  command = plan

  assert {
    condition     = local.subscription_id == "/subscriptions/00000000-0000-0000-0000-000000000000"
    error_message = "The module must default to the current provider subscription ID when subscription_id is omitted."
  }

  assert {
    condition     = local.subscription_name == "DX Current"
    error_message = "The module must default to the current provider subscription display name when subscription_name is omitted."
  }

  assert {
    condition     = output.dx_app_ci_resource_group_reader == "DX Current DX App CI Resource Groups"
    error_message = "The generated role names must use the current provider subscription display name as prefix when no explicit inputs are provided."
  }
}

run "uses_provided_subscription_id_and_discovers_name_when_name_is_omitted" {
  command = plan

  variables {
    subscription_id = "/subscriptions/11111111-1111-1111-1111-111111111111"
  }

  override_data {
    target = data.azurerm_subscription.current
    values = {
      id              = "/subscriptions/11111111-1111-1111-1111-111111111111"
      subscription_id = "11111111-1111-1111-1111-111111111111"
      display_name    = "DX Standalone"
    }
  }

  assert {
    condition     = local.subscription_id == "/subscriptions/11111111-1111-1111-1111-111111111111"
    error_message = "The module must preserve the provided subscription_id when resolving a missing subscription_name."
  }

  assert {
    condition     = local.subscription_name == "DX Standalone"
    error_message = "The module must resolve the subscription display name for a provided subscription_id when subscription_name is omitted."
  }

  assert {
    condition     = output.dx_function_host_storage == "DX Standalone DX Function Host Storage"
    error_message = "The generated role names must use the discovered display name when only subscription_id is provided."
  }
}

run "subscription_name_requires_subscription_id" {
  command = plan

  variables {
    subscription_name = "DX Standalone"
  }

  expect_failures = [var.subscription_name]
}

run "subscription_id_must_not_be_blank" {
  command = plan

  variables {
    subscription_id = "   "
  }

  expect_failures = [var.subscription_id]
}

run "subscription_name_must_not_be_blank" {
  command = plan

  variables {
    subscription_id   = "/subscriptions/22222222-2222-2222-2222-222222222222"
    subscription_name = "   "
  }

  expect_failures = [var.subscription_name]
}
