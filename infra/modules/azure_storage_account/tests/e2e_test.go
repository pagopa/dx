package test

import (
	"encoding/json"
	"fmt"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/gruntwork-io/terratest/modules/terraform"
	test_structure "github.com/gruntwork-io/terratest/modules/test-structure"
)

type delegatedAccessVerifierResponse struct {
	Status            string `json:"status"`
	Error             string `json:"error,omitempty"`
	BlobName          string `json:"blobName,omitempty"`
	BlobURL           string `json:"blobUrl,omitempty"`
	UploadedContent   string `json:"uploadedContent,omitempty"`
	DownloadedContent string `json:"downloadedContent,omitempty"`
}

func TestAzureStorageAccountDelegatedAccessUserDelegationSAS(t *testing.T) {
	fixtureFolder := "../examples/delegated-access-sas"

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

	test_structure.RunTestStage(t, "validate_user_delegation_sas", func() {
		terraformOptions := test_structure.LoadTerraformOptions(t, fixtureFolder)

		storageAccountName := terraform.Output(t, terraformOptions, "storage_account_name")
		containerName := terraform.Output(t, terraformOptions, "container_name")

		result := runDelegatedAccessVerifierWithRetry(t, storageAccountName, containerName)

		if result.Status != "ok" {
			t.Fatalf("expected verifier status ok, got %q with error %q", result.Status, result.Error)
		}

		if result.UploadedContent == "" || result.DownloadedContent == "" {
			t.Fatalf("expected verifier to return uploaded and downloaded content, got %#v", result)
		}

		if result.UploadedContent != result.DownloadedContent {
			t.Fatalf("expected uploaded content to match downloaded content, got uploaded=%q downloaded=%q", result.UploadedContent, result.DownloadedContent)
		}

		if !strings.Contains(result.BlobURL, fmt.Sprintf("/%s/%s", containerName, result.BlobName)) {
			t.Fatalf("expected blob URL %q to contain container %q and blob %q", result.BlobURL, containerName, result.BlobName)
		}
	})
}

func runDelegatedAccessVerifierWithRetry(t *testing.T, storageAccountName string, containerName string) delegatedAccessVerifierResponse {
	t.Helper()

	const maxAttempts = 12
	const retryDelay = 15 * time.Second

	testsDir, err := filepath.Abs(".")
	if err != nil {
		t.Fatalf("failed to resolve tests directory: %v", err)
	}

	var lastOutput string
	var lastError error

	for attempt := 1; attempt <= maxAttempts; attempt++ {
		blobName := fmt.Sprintf("delegated-access-e2e-%d.txt", time.Now().UnixNano())

		response, output, err := runDelegatedAccessVerifier(testsDir, storageAccountName, containerName, blobName)
		if err == nil && response.Status == "ok" {
			t.Logf("delegated access verifier succeeded on attempt %d for blob %s", attempt, response.BlobName)
			return response
		}

		lastOutput = output
		lastError = err

		t.Logf(
			"delegated access verifier attempt %d/%d not ready yet: err=%v output=%s",
			attempt,
			maxAttempts,
			err,
			compactLogText(output, 400),
		)

		if attempt < maxAttempts {
			time.Sleep(retryDelay)
		}
	}

	t.Fatalf(
		"delegated access verifier never succeeded: err=%v output=%s",
		lastError,
		compactLogText(lastOutput, 1200),
	)

	return delegatedAccessVerifierResponse{}
}

func runDelegatedAccessVerifier(testsDir string, storageAccountName string, containerName string, blobName string) (delegatedAccessVerifierResponse, string, error) {
	args := []string{
		"run",
		"./cmd/verify-user-delegation-sas",
		"--account-name",
		storageAccountName,
		"--container-name",
		containerName,
		"--blob-name",
		blobName,
	}

	command := exec.Command("go", args...)
	command.Dir = testsDir

	output, err := command.CombinedOutput()
	trimmedOutput := strings.TrimSpace(string(output))

	var response delegatedAccessVerifierResponse
	if trimmedOutput != "" {
		if unmarshalError := json.Unmarshal([]byte(trimmedOutput), &response); unmarshalError != nil {
			return delegatedAccessVerifierResponse{}, trimmedOutput, fmt.Errorf("could not parse verifier output as JSON: %w", unmarshalError)
		}
	}

	if err != nil {
		return response, trimmedOutput, fmt.Errorf("verifier command failed: %w", err)
	}

	if response.Status != "ok" {
		return response, trimmedOutput, fmt.Errorf("verifier returned status %q", response.Status)
	}

	return response, trimmedOutput, nil
}

func compactLogText(text string, limit int) string {
	trimmed := strings.TrimSpace(text)
	if len(trimmed) <= limit {
		return trimmed
	}

	return fmt.Sprintf("%s...", trimmed[:limit])
}