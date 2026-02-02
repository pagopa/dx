package test

import (
	"crypto/tls"
	"fmt"
	"net/http"
	"testing"
	"time"

	httpHelper "github.com/gruntwork-io/terratest/modules/http-helper"
	"github.com/gruntwork-io/terratest/modules/terraform"
	test_structure "github.com/gruntwork-io/terratest/modules/test-structure"
)

// TestCDNEndpointAccessibility tests that the CDN endpoint is accessible via HTTPS
func TestCDNEndpointAccessibility(t *testing.T) {
	fixtureFolder := "../examples/advanced"

	test_structure.RunTestStage(t, "setup", func() {
		terraformOptions := &terraform.Options{
			TerraformDir: fixtureFolder,
		}

		test_structure.SaveTerraformOptions(t, fixtureFolder, terraformOptions)

		terraform.InitAndApply(t, terraformOptions)
	})

	test_structure.RunTestStage(t, "validate_cdn_endpoint", func() {
		terraformOptions := test_structure.LoadTerraformOptions(t, fixtureFolder)

		endpointHostname := terraform.Output(t, terraformOptions, "endpoint_host_name")

		// Test HTTPS endpoint accessibility
		httpsURL := fmt.Sprintf("https://%s", endpointHostname)
		validateEndpointAccessibility(t, httpsURL, true)
	})

	test_structure.RunTestStage(t, "validate_https_redirect", func() {
		terraformOptions := test_structure.LoadTerraformOptions(t, fixtureFolder)

		endpointHostname := terraform.Output(t, terraformOptions, "endpoint_host_name")

		// Test HTTP redirects to HTTPS
		httpURL := fmt.Sprintf("http://%s", endpointHostname)
		validateHTTPSRedirect(t, httpURL)
	})

	test_structure.RunTestStage(t, "validate_custom_domain", func() {
		terraformOptions := test_structure.LoadTerraformOptions(t, fixtureFolder)

		customDomainHostnames := terraform.OutputList(t, terraformOptions, "custom_domain_host_names")

		if len(customDomainHostnames) > 0 {
			for _, hostname := range customDomainHostnames {
				customDomainURL := fmt.Sprintf("https://%s", hostname)
				validateEndpointAccessibility(t, customDomainURL, false)
			}
		}
	})

	test_structure.RunTestStage(t, "teardown", func() {
		terraformOptions := test_structure.LoadTerraformOptions(t, fixtureFolder)
		terraform.Destroy(t, terraformOptions)
	})
}

// validateEndpointAccessibility checks if the CDN endpoint is reachable
func validateEndpointAccessibility(t *testing.T, url string, strictValidation bool) {
	tlsConfig := tls.Config{
		MinVersion: tls.VersionTLS12,
	}
	maxRetries := 20
	delay := 10 * time.Second

	httpHelper.HttpGetWithRetryWithCustomValidation(t, url, &tlsConfig, maxRetries, delay, func(statusCode int, body string) bool {
		// For CDN, we accept 200 (content exists) or 404 (no content but CDN is working)
		// We also accept 403 if there's a WAF rule blocking the request
		if strictValidation {
			return statusCode == http.StatusOK || statusCode == http.StatusNotFound
		}
		// For custom domains during propagation, we're more lenient
		return statusCode >= 200 && statusCode < 500
	})
}

// validateHTTPSRedirect checks if HTTP requests are redirected to HTTPS
func validateHTTPSRedirect(t *testing.T, httpURL string) {
	tlsConfig := tls.Config{
		MinVersion: tls.VersionTLS12,
	}
	maxRetries := 10
	delay := 5 * time.Second

	httpHelper.HttpGetWithRetryWithCustomValidation(t, httpURL, &tlsConfig, maxRetries, delay, func(statusCode int, body string) bool {
		// HTTP should redirect to HTTPS (301, 302, 307, or 308)
		return statusCode == http.StatusMovedPermanently ||
			statusCode == http.StatusFound ||
			statusCode == http.StatusTemporaryRedirect ||
			statusCode == http.StatusPermanentRedirect
	})
}
