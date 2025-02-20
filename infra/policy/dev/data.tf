data "azurerm_subscription" "current" {}

data "http" "policy" {
  url = "https://raw.githubusercontent.com/pagopa/dx/refs/heads/CES-760-test-http/infra/policy/_policy_rules/test_role.json"
}