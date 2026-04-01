package test

import (
	"crypto/tls"
	"fmt"
	"strings"
	"testing"
	"time"

	httpHelper "github.com/gruntwork-io/terratest/modules/http-helper"
	"github.com/gruntwork-io/terratest/modules/terraform"
	test_structure "github.com/gruntwork-io/terratest/modules/test-structure"
)

func TestAppConfigurationE2E(t *testing.T) {
	t.Run("NetworkSettings", func(t *testing.T) {
		runAppConfigurationScenario(t, "../examples/network_access/", "validate_private_connectivity", func(t *testing.T, terraformOptions *terraform.Options) {
			appConfigName := terraform.Output(t, terraformOptions, "name")
			publicApp := terraform.Output(t, terraformOptions, "public_app_ip_address")
			privateApp := terraform.Output(t, terraformOptions, "private_app_ip_address")

			probeSetting(t, privateApp, appConfigName, 200)
			probeSetting(t, publicApp, appConfigName, 502)
		})
	})

	t.Run("KeyVaultIntegration", func(t *testing.T) {
		runAppConfigurationScenario(t, "../examples/keyvault_integration/", "validate_keyvault_integration", func(t *testing.T, terraformOptions *terraform.Options) {
			appConfigName := terraform.Output(t, terraformOptions, "name")
			privateApp := terraform.Output(t, terraformOptions, "private_app_ip_address")

			probeSetting(t, privateApp, appConfigName, 200)
			probeSecret(t, privateApp, appConfigName, 200)
		})
	})
}

func runAppConfigurationScenario(t *testing.T, fixtureFolder string, validateStage string, validate func(t *testing.T, terraformOptions *terraform.Options)) {
	t.Helper()

	defer test_structure.RunTestStage(t, "teardown", func() {
		terraformOptions := test_structure.LoadTerraformOptions(t, fixtureFolder)
		terraform.Destroy(t, terraformOptions)
	})

	test_structure.RunTestStage(t, "setup", func() {
		terraformOptions := &terraform.Options{
			TerraformDir: fixtureFolder,
		}

		test_structure.SaveTerraformOptions(t, fixtureFolder, terraformOptions)

		terraform.InitAndApply(t, terraformOptions)
	})

	test_structure.RunTestStage(t, validateStage, func() {
		terraformOptions := test_structure.LoadTerraformOptions(t, fixtureFolder)
		validate(t, terraformOptions)
	})
}

func probeSetting(t *testing.T, appIPAddress string, appConfigName string, expectedStatus int) {
	url := fmt.Sprintf("http://%s:8080/setting?instanceName=%s", appIPAddress, appConfigName)
	probe(t, url, expectedStatus)
}

func probeSecret(t *testing.T, appIPAddress string, appConfigName string, expectedStatus int) {
	url := fmt.Sprintf("http://%s:8080/secret?instanceName=%s", appIPAddress, appConfigName)
	probe(t, url, expectedStatus)
}

func probe(t *testing.T, url string, expectedStatus int) {
	maxRetries := 20
	delay := 15 * time.Second

	options := httpHelper.HttpGetOptions{
		Url:       url,
		TlsConfig: &tls.Config{},
		Timeout:   15,
	}

	httpHelper.HttpGetWithRetryWithCustomValidationWithOptions(t, options, maxRetries, delay, func(statusCode int, body string) bool {
		if statusCode != expectedStatus {
			return false
		}
		if expectedStatus == 502 {
			return true
		}
		trimmed := strings.TrimSpace(body)
		if expectedStatus == 200 {
			return trimmed == `{"key":"test value"}` || trimmed == `{"secret-key":"secret value"}`
		}
		return false
	})
}
