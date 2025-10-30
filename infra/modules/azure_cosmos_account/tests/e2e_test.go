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

func TestCosmosDBNetworkAccess(t *testing.T) {
	fixtureFolder := "../examples/network_access"

	test_structure.RunTestStage(t, "setup", func() {
		terraformOptions := &terraform.Options{
			TerraformDir: fixtureFolder,
		}

		test_structure.SaveTerraformOptions(t, fixtureFolder, terraformOptions)

		terraform.InitAndApply(t, terraformOptions)
	})

	test_structure.RunTestStage(t, "validate_public_cosmos", func() {
		terraformOptions := test_structure.LoadTerraformOptions(t, fixtureFolder)

		privateApp := terraform.Output(t, terraformOptions, "private_app_ip_address")
		publicApp := terraform.Output(t, terraformOptions, "public_app_ip_address")
		publicAccountName := terraform.Output(t, terraformOptions, "public_account_name")

		invokeApp(t, publicApp, publicAccountName, 200)
		invokeApp(t, privateApp, publicAccountName, 200)
	})

	test_structure.RunTestStage(t, "validate_private_cosmos", func() {
		terraformOptions := test_structure.LoadTerraformOptions(t, fixtureFolder)

		privateApp := terraform.Output(t, terraformOptions, "private_app_ip_address")
		publicApp := terraform.Output(t, terraformOptions, "public_app_ip_address")
		privateAccountName := terraform.Output(t, terraformOptions, "private_account_name")

		invokeApp(t, publicApp, privateAccountName, 400)
		invokeApp(t, privateApp, privateAccountName, 200)
	})

	test_structure.RunTestStage(t, "teardown", func() {
		terraformOptions := test_structure.LoadTerraformOptions(t, fixtureFolder)
		terraform.Destroy(t, terraformOptions)
	})
}

func invokeApp(t *testing.T, appIPAddress string, cosmosName string, expectedStatus int) {

	url := fmt.Sprintf("http://%s:8080/probe?endpoint=%s&db=db&container=items", appIPAddress, cosmosName)

	tlsConfig := tls.Config{}
	maxRetries := 10
	delay := 5 * time.Second

	httpHelper.HttpGetWithRetryWithCustomValidation(t, url, &tlsConfig, maxRetries, delay, func(statusCode int, body string) bool {
		if statusCode != expectedStatus {
			return false
		}
		trimmed := strings.TrimSpace(body)
		if expectedStatus == 200 {
			return trimmed == "{\"status\":\"ok\"}"
		}
		if expectedStatus == 400 {
			return strings.HasPrefix(trimmed, "{\"status\":\"fail\",\"error\":\"")
		}
		return false
	})
}
