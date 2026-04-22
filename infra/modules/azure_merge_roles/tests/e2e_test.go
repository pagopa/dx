package test

import (
	"crypto/tls"
	"encoding/json"
	"fmt"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
	"time"

	httpHelper "github.com/gruntwork-io/terratest/modules/http-helper"
	"github.com/gruntwork-io/terratest/modules/terraform"
	test_structure "github.com/gruntwork-io/terratest/modules/test-structure"
)

type probeOperation struct {
	Success bool   `json:"success"`
	Error   string `json:"error,omitempty"`
	Content string `json:"content,omitempty"`
}

type probeResponse struct {
	Status   string         `json:"status"`
	Error    string         `json:"error,omitempty"`
	BlobName string         `json:"blob_name"`
	Write    probeOperation `json:"write"`
	Read     probeOperation `json:"read"`
	Delete   probeOperation `json:"delete"`
}

type managementProbeResponse struct {
	Status        string         `json:"status"`
	Error         string         `json:"error,omitempty"`
	ContainerName string         `json:"container_name"`
	Write         probeOperation `json:"write"`
	Read          probeOperation `json:"read"`
	Delete        probeOperation `json:"delete"`
}

func TestAzureMergeRolesBlobRBAC(t *testing.T) {
	fixtureFolder := "../examples/blob_rbac_validation"

	defer test_structure.RunTestStage(t, "teardown", func() {
		// Azure can take a long time to delete custom role definitions during a
		// Terraform destroy. Deleting the whole fixture resource group is more
		// reliable for this scenario and still validates the test cleanup path.
		terraformOptions := test_structure.LoadTerraformOptions(t, fixtureFolder)

		resourceGroupName, err := terraform.OutputE(t, terraformOptions, "resource_group_name")
		if err != nil || strings.TrimSpace(resourceGroupName) == "" {
			terraform.Destroy(t, terraformOptions)
			return
		}

		deleteFixtureResourceGroup(t, terraformOptions.TerraformDir, resourceGroupName)
	})

	test_structure.RunTestStage(t, "setup", func() {
		terraformOptions := &terraform.Options{
			TerraformDir: fixtureFolder,
		}

		test_structure.SaveTerraformOptions(t, fixtureFolder, terraformOptions)
		terraform.InitAndApply(t, terraformOptions)
	})

	test_structure.RunTestStage(t, "validate_limited_merged_role", func() {
		terraformOptions := test_structure.LoadTerraformOptions(t, fixtureFolder)

		appIP := terraform.Output(t, terraformOptions, "limited_app_ip_address")
		storageAccountName := terraform.Output(t, terraformOptions, "storage_account_name")
		containerName := terraform.Output(t, terraformOptions, "container_name")

		probeBlobPermissions(t, appIP, storageAccountName, containerName, false)
	})

	test_structure.RunTestStage(t, "validate_delete_restored_merged_role", func() {
		terraformOptions := test_structure.LoadTerraformOptions(t, fixtureFolder)

		appIP := terraform.Output(t, terraformOptions, "full_app_ip_address")
		storageAccountName := terraform.Output(t, terraformOptions, "storage_account_name")
		containerName := terraform.Output(t, terraformOptions, "container_name")

		// This stage locks the repository's permissive merge policy in a real
		// Azure data-plane flow: a broad wildcard exclusion is overridden by a
		// narrower permission block that restores delete.
		probeBlobPermissions(t, appIP, storageAccountName, containerName, true)
	})

	test_structure.RunTestStage(t, "validate_limited_control_plane_role", func() {
		terraformOptions := test_structure.LoadTerraformOptions(t, fixtureFolder)

		appIP := terraform.Output(t, terraformOptions, "limited_app_ip_address")
		storageAccountID := terraform.Output(t, terraformOptions, "storage_account_id")

		probeManagementContainerPermissions(t, appIP, storageAccountID, false)
	})

	test_structure.RunTestStage(t, "validate_delete_restored_control_plane_role", func() {
		terraformOptions := test_structure.LoadTerraformOptions(t, fixtureFolder)

		appIP := terraform.Output(t, terraformOptions, "full_app_ip_address")
		storageAccountID := terraform.Output(t, terraformOptions, "storage_account_id")

		probeManagementContainerPermissions(t, appIP, storageAccountID, true)
	})
}

func probeBlobPermissions(t *testing.T, appIPAddress string, storageAccountName string, containerName string, expectDeleteSuccess bool) {
	url := fmt.Sprintf("http://%s:8080/probe?account=%s&container=%s", appIPAddress, storageAccountName, containerName)
	expectation := "expect delete to be denied"
	if expectDeleteSuccess {
		expectation = "expect delete to succeed"
	}

	tlsConfig := tls.Config{}
	maxRetries := 20
	delay := 15 * time.Second
	attempt := 0

	t.Logf("Probing blob RBAC at %s (%s)", url, expectation)

	// Role assignments and managed identities can take time to propagate through
	// Azure RBAC, so the probe retries until the expected effective permission is
	// observable from inside the container app.
	httpHelper.HttpGetWithRetryWithCustomValidation(t, url, &tlsConfig, maxRetries, delay, func(statusCode int, body string) bool {
		attempt++

		if statusCode != 200 {
			t.Logf("Probe attempt %d (%s) returned HTTP %d: %s", attempt, expectation, statusCode, compactLogText(body, 240))
			return false
		}

		var response probeResponse
		if err := json.Unmarshal([]byte(body), &response); err != nil {
			t.Logf("Probe attempt %d (%s) returned invalid JSON: %v: %s", attempt, expectation, err, compactLogText(body, 240))
			return false
		}

		if validationIssue := validateProbeResponse(response, expectDeleteSuccess); validationIssue != "" {
			t.Logf("Probe attempt %d (%s) not ready yet: %s", attempt, expectation, validationIssue)
			return false
		}

		t.Logf(
			"Probe attempt %d (%s) succeeded: blob=%s write=%s read=%s delete=%s",
			attempt,
			expectation,
			response.BlobName,
			describeProbeOperation(response.Write),
			describeProbeOperation(response.Read),
			describeProbeOperation(response.Delete),
		)

		return true
	})
}

func probeManagementContainerPermissions(t *testing.T, appIPAddress string, storageAccountID string, expectDeleteSuccess bool) {
	probeURL := fmt.Sprintf("http://%s:8080/management-probe?account_id=%s", appIPAddress, url.QueryEscape(storageAccountID))
	expectation := "expect control-plane delete to be denied"
	if expectDeleteSuccess {
		expectation = "expect control-plane delete to succeed"
	}

	tlsConfig := tls.Config{}
	maxRetries := 20
	delay := 15 * time.Second
	attempt := 0

	t.Logf("Probing control-plane RBAC at %s (%s)", probeURL, expectation)

	httpHelper.HttpGetWithRetryWithCustomValidation(t, probeURL, &tlsConfig, maxRetries, delay, func(statusCode int, body string) bool {
		attempt++

		if statusCode != 200 {
			t.Logf("Control-plane probe attempt %d (%s) returned HTTP %d: %s", attempt, expectation, statusCode, compactLogText(body, 240))
			return false
		}

		var response managementProbeResponse
		if err := json.Unmarshal([]byte(body), &response); err != nil {
			t.Logf("Control-plane probe attempt %d (%s) returned invalid JSON: %v: %s", attempt, expectation, err, compactLogText(body, 240))
			return false
		}

		if validationIssue := validateManagementProbeResponse(response, expectDeleteSuccess); validationIssue != "" {
			t.Logf("Control-plane probe attempt %d (%s) not ready yet: %s", attempt, expectation, validationIssue)
			return false
		}

		t.Logf(
			"Control-plane probe attempt %d (%s) succeeded: container=%s write=%s read=%s delete=%s",
			attempt,
			expectation,
			response.ContainerName,
			describeProbeOperation(response.Write),
			describeProbeOperation(response.Read),
			describeProbeOperation(response.Delete),
		)

		return true
	})
}

func validateProbeResponse(response probeResponse, expectDeleteSuccess bool) string {
	if response.Status != "ok" {
		return fmt.Sprintf("status=%q error=%s", response.Status, compactLogText(response.Error, 240))
	}

	if response.BlobName == "" {
		return "missing blob name"
	}

	if !response.Write.Success {
		return fmt.Sprintf("write failed: %s", describeProbeOperation(response.Write))
	}

	if !response.Read.Success {
		return fmt.Sprintf("read failed: %s", describeProbeOperation(response.Read))
	}

	expectedContent := fmt.Sprintf("probe:%s", response.BlobName)
	if response.Read.Content != expectedContent {
		return fmt.Sprintf("unexpected read content=%s expected=%s", compactLogText(response.Read.Content, 120), compactLogText(expectedContent, 120))
	}

	if expectDeleteSuccess {
		if !response.Delete.Success || strings.TrimSpace(response.Delete.Error) != "" {
			return fmt.Sprintf("delete should succeed but got: %s", describeProbeOperation(response.Delete))
		}

		return ""
	}

	if response.Delete.Success || strings.TrimSpace(response.Delete.Error) == "" {
		return fmt.Sprintf("delete should be denied but got: %s", describeProbeOperation(response.Delete))
	}

	return ""
}

func validateManagementProbeResponse(response managementProbeResponse, expectDeleteSuccess bool) string {
	if response.Status != "ok" {
		return fmt.Sprintf("status=%q error=%s", response.Status, compactLogText(response.Error, 240))
	}

	if response.ContainerName == "" {
		return "missing container name"
	}

	if !response.Write.Success {
		return fmt.Sprintf("write failed: %s", describeProbeOperation(response.Write))
	}

	if !response.Read.Success {
		return fmt.Sprintf("read failed: %s", describeProbeOperation(response.Read))
	}

	if expectDeleteSuccess {
		if !response.Delete.Success || strings.TrimSpace(response.Delete.Error) != "" {
			return fmt.Sprintf("delete should succeed but got: %s", describeProbeOperation(response.Delete))
		}

		return ""
	}

	if response.Delete.Success || strings.TrimSpace(response.Delete.Error) == "" {
		return fmt.Sprintf("delete should be denied but got: %s", describeProbeOperation(response.Delete))
	}

	return ""
}

func describeProbeOperation(operation probeOperation) string {
	parts := []string{fmt.Sprintf("success=%t", operation.Success)}

	if strings.TrimSpace(operation.Error) != "" {
		parts = append(parts, fmt.Sprintf("error=%s", compactLogText(operation.Error, 180)))
	}

	if strings.TrimSpace(operation.Content) != "" {
		parts = append(parts, fmt.Sprintf("content=%s", compactLogText(operation.Content, 120)))
	}

	return strings.Join(parts, " ")
}

func compactLogText(value string, maxLen int) string {
	trimmed := strings.Join(strings.Fields(strings.TrimSpace(value)), " ")
	if trimmed == "" {
		return "<empty>"
	}

	if len(trimmed) <= maxLen || maxLen < 4 {
		return trimmed
	}

	return trimmed[:maxLen-3] + "..."
}

func deleteFixtureResourceGroup(t *testing.T, terraformDir string, resourceGroupName string) {
	t.Helper()

	exists, err := azureResourceGroupExists(resourceGroupName)
	if err != nil {
		t.Fatalf("check resource group %q existence: %v", resourceGroupName, err)
	}

	if exists {
		t.Logf("Deleting fixture resource group %s via Azure CLI", resourceGroupName)
		if _, err := runAzureCommand("group", "delete", "--name", resourceGroupName, "--yes", "--no-wait"); err != nil {
			t.Fatalf("delete resource group %q: %v", resourceGroupName, err)
		}

		deadline := time.Now().Add(20 * time.Minute)
		for {
			exists, err = azureResourceGroupExists(resourceGroupName)
			if err == nil && !exists {
				break
			}

			if time.Now().After(deadline) {
				if err != nil {
					t.Fatalf("resource group %q deletion did not complete before timeout: %v", resourceGroupName, err)
				}

				t.Fatalf("resource group %q still exists after waiting for Azure deletion", resourceGroupName)
			}

			if err != nil {
				t.Logf("Waiting for resource group %s deletion, existence check failed temporarily: %v", resourceGroupName, err)
			} else {
				t.Logf("Waiting for resource group %s deletion to complete", resourceGroupName)
			}

			time.Sleep(15 * time.Second)
		}
	}

	cleanupTerraformState(t, terraformDir)
}

func azureResourceGroupExists(resourceGroupName string) (bool, error) {
	output, err := runAzureCommand("group", "exists", "--name", resourceGroupName, "-o", "tsv")
	if err != nil {
		return false, err
	}

	return strings.EqualFold(strings.TrimSpace(output), "true"), nil
}

func runAzureCommand(args ...string) (string, error) {
	command := exec.Command("az", args...)
	output, err := command.CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("az %s: %w: %s", strings.Join(args, " "), err, strings.TrimSpace(string(output)))
	}

	return string(output), nil
}

func cleanupTerraformState(t *testing.T, terraformDir string) {
	t.Helper()

	paths := []string{
		filepath.Join(terraformDir, ".test-data"),
		filepath.Join(terraformDir, "terraform.tfstate"),
		filepath.Join(terraformDir, "terraform.tfstate.backup"),
		filepath.Join(terraformDir, ".terraform.tfstate.lock.info"),
	}

	for _, path := range paths {
		if err := os.RemoveAll(path); err != nil {
			t.Fatalf("remove fixture state path %q: %v", path, err)
		}
	}
}
