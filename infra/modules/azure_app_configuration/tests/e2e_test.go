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

func TestAppConfigurationNetworkSettings(t *testing.T) {
	fixtureFolder := "../examples/network_access/"

	test_structure.RunTestStage(t, "setup", func() {
		terraformOptions := &terraform.Options{
			TerraformDir: fixtureFolder,
		}

		test_structure.SaveTerraformOptions(t, fixtureFolder, terraformOptions)

		terraform.InitAndApply(t, terraformOptions)
	})

	test_structure.RunTestStage(t, "validate_private_connectivity", func() {
		terraformOptions := test_structure.LoadTerraformOptions(t, fixtureFolder)

		appConfigName := terraform.Output(t, terraformOptions, "name")
		publicApp := terraform.Output(t, terraformOptions, "public_app_ip_address")
		privateApp := terraform.Output(t, terraformOptions, "private_app_ip_address")

		probeSetting(t, privateApp, appConfigName, 200)
		probeSetting(t, publicApp, appConfigName, 502)
	})

	// test_structure.RunTestStage(t, "teardown", func() {
	// 	terraformOptions := test_structure.LoadTerraformOptions(t, fixtureFolder)
	// 	terraform.Destroy(t, terraformOptions)
	// })
}

func probeSetting(t *testing.T, appIPAddress string, appConfigName string, expectedStatus int) {
	url := fmt.Sprintf("http://%s:8080/setting?instanceName=%s", appIPAddress, appConfigName)

	maxRetries := 3
	delay := 5 * time.Second

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
			return trimmed == `{"key":"test value"}`
		}
		return false
	})
}
