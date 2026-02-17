# E2E Tests (e2e_test.go)

**Purpose**: Deploy complete scenarios with workloads to verify end-to-end functionality.

## Key Patterns

- Use Terratest framework
- Deploy from `examples/` directory (not the module directly, not tests/setup)
- Examples must contain `fixtures.tf` (support infrastructure) and `mut.tf` (module under test)
- E2E infrastructure is **separate from integration infrastructure**
- Use test_structure for stage management
- Deploy test applications as containers or compute
- Verify runtime behavior by calling HTTP APIs exposed by test apps (tests/apps/)
- Always include teardown stage

## Structure

```go
package test

import (
	"testing"
	httpHelper "github.com/gruntwork-io/terratest/modules/http-helper"
	"github.com/gruntwork-io/terratest/modules/terraform"
	test_structure "github.com/gruntwork-io/terratest/modules/test-structure"
)

func Test<ModuleName><Scenario>(t *testing.T) {
	fixtureFolder := "../examples/<scenario_name>/"

	test_structure.RunTestStage(t, "setup", func() {
		terraformOptions := &terraform.Options{
			TerraformDir: fixtureFolder,
		}

		test_structure.SaveTerraformOptions(t, fixtureFolder, terraformOptions)
		terraform.InitAndApply(t, terraformOptions)
	})

	test_structure.RunTestStage(t, "validate_<aspect>", func() {
		terraformOptions := test_structure.LoadTerraformOptions(t, fixtureFolder)

		// Get outputs
		resourceName := terraform.Output(t, terraformOptions, "resource_name")
		appIP := terraform.Output(t, terraformOptions, "app_ip_address")

		// Verify behavior
		probeEndpoint(t, appIP, resourceName, 200)
	})

	test_structure.RunTestStage(t, "teardown", func() {
		terraformOptions := test_structure.LoadTerraformOptions(t, fixtureFolder)
		terraform.Destroy(t, terraformOptions)
	})
}

func probeEndpoint(t *testing.T, appIP string, resource string, expectedStatus int) {
	url := fmt.Sprintf("http://%s:8080/probe?resource=%s", appIP, resource)

	tlsConfig := &tls.Config{}
	maxRetries := 10
	delay := 5 * time.Second

	httpHelper.HttpGetWithRetryWithCustomValidation(
		t, url, tlsConfig, maxRetries, delay,
		func(statusCode int, body string) bool {
			return statusCode == expectedStatus && validateBody(body)
		},
	)
}
```

## What to Test

- Network connectivity (public vs private)
- IAM permissions and authentication
- Integration with dependent services (Key Vault, Storage, etc.)
- Service-specific functionality
- Multi-region scenarios
- Disaster recovery capabilities
