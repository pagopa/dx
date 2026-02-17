# Contract Tests (contract.tftest.hcl)

**Purpose**: Validate input validation, variable constraints, and expected failures.

## Key Patterns

- Use `mock_provider` like unit tests
- Share the same `variables {}` block structure as unit tests
- Use `expect_failures = [var.variable_name]` to verify validation rules
- Test boundary conditions and invalid inputs
- Verify preconditions and postconditions
- Test resource naming constraints

## Example

```hcl
variables {
  // Same structure as unit tests
  environment = { /* ... */ }
  tags        = { /* ... */ }
  // ... common inputs
}

mock_provider "azurerm" {}

override_data {
  // Same overrides as unit tests if needed
}

run "invalid_size_value" {
  command = plan
  variables {
    size = "invalid"
  }

  expect_failures = [
    var.size,
  ]
}

run "invalid_use_case_combination" {
  command = plan
  variables {
    use_case = "development"
    size     = "premium"
  }

  expect_failures = [
    var.size,
  ]
}

run "valid_explicit_configuration" {
  command = plan
  variables {
    size = "premium"
  }

  assert {
    condition     = azurerm_resource.this.sku == "premium"
    error_message = "Explicit size must be respected"
  }
}

run "naming_constraint_validation" {
  command = plan
  variables {
    environment = merge(var.environment, {
      app_name = "this-name-is-way-too-long-and-should-fail-validation"
    })
  }

  expect_failures = [
    var.environment,
  ]
}
```

## What to Test

- Variable validation rules
- Custom validation conditions
- Type constraints
- Value constraints (allowed values, ranges)
- Precondition failures
- Postcondition failures
- Naming convention enforcement
- Mutually exclusive configurations
