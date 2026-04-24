package test

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"slices"
	"strings"
	"testing"
	"time"

	"github.com/gruntwork-io/terratest/modules/terraform"
	test_structure "github.com/gruntwork-io/terratest/modules/test-structure"
)

const (
	githubAPIBaseURL      = "https://api.github.com"
	githubAPIVersion      = "2022-11-28"
	githubRepositoryOwner = "pagopa"
	githubRepositoryName  = "dx"
	githubWorkflowFile    = "_release_github-e2e-selfhosted-runner.yaml"
	pollInterval          = 15 * time.Second
	runTimeout            = 20 * time.Minute
)

type githubConfig struct {
	owner string
	repo  string
	ref   string
	token string
}

var githubHTTPClient = &http.Client{Timeout: 30 * time.Second}

type runnerScenario struct {
	name          string
	fixtureFolder string
	requiredEnv   [][]string
	seedSecrets   func(t *testing.T, keyVaultName string)
}

type workflowRun struct {
	ID           int64  `json:"id"`
	Status       string `json:"status"`
	Conclusion   string `json:"conclusion"`
	HTMLURL      string `json:"html_url"`
	DisplayTitle string `json:"display_title"`
}

type workflowRunsResponse struct {
	WorkflowRuns []workflowRun `json:"workflow_runs"`
}

type workflowJob struct {
	Name       string   `json:"name"`
	Conclusion string   `json:"conclusion"`
	RunnerName string   `json:"runner_name"`
	Labels     []string `json:"labels"`
}

type workflowJobsResponse struct {
	Jobs []workflowJob `json:"jobs"`
}

func TestGitHubSelfHostedRunnerPatE2E(t *testing.T) {
	runRunnerScenario(t, runnerScenario{
		name:          "pat",
		fixtureFolder: "../examples/pat_based/",
		requiredEnv: [][]string{
			{"GITHUB_TOKEN", "GH_TOKEN"},
			{"E2E_GITHUB_RUNNER_PAT"},
		},
		seedSecrets: func(t *testing.T, keyVaultName string) {
			setKeyVaultSecret(t, keyVaultName, "github-runner-pat", requireEnv(t, "E2E_GITHUB_RUNNER_PAT"))
		},
	})
}

// func TestGitHubSelfHostedRunnerAppE2E(t *testing.T) {
// 	runRunnerScenario(t, runnerScenario{
// 		name:          "app",
// 		fixtureFolder: "../examples/app_based/",
// 		requiredEnv: [][]string{
// 			{"GITHUB_TOKEN", "GH_TOKEN"},
// 			{"E2E_GITHUB_APP_ID"},
// 			{"E2E_GITHUB_APP_INSTALLATION_ID"},
// 			{"E2E_GITHUB_APP_PRIVATE_KEY"},
// 		},
// 		seedSecrets: func(t *testing.T, keyVaultName string) {
// 			setKeyVaultSecret(t, keyVaultName, "github-runner-app-id", requireEnv(t, "E2E_GITHUB_APP_ID"))
// 			setKeyVaultSecret(t, keyVaultName, "github-runner-app-installation-id", requireEnv(t, "E2E_GITHUB_APP_INSTALLATION_ID"))
// 			setKeyVaultSecret(t, keyVaultName, "github-runner-app-key", requireEnv(t, "E2E_GITHUB_APP_PRIVATE_KEY"))
// 		},
// 	})
// }

func runRunnerScenario(t *testing.T, scenario runnerScenario) {
	t.Helper()

	validateRequiredEnv(t, scenario.requiredEnv)

	github := loadGitHubConfig(t)

	test_structure.RunTestStage(t, "setup", func() {
		terraformOptions := &terraform.Options{
			TerraformDir: scenario.fixtureFolder,
		}

		test_structure.SaveTerraformOptions(t, scenario.fixtureFolder, terraformOptions)
		terraform.InitAndApply(t, terraformOptions)

		keyVaultName := terraform.Output(t, terraformOptions, "key_vault_name")
		scenario.seedSecrets(t, keyVaultName)
	})

	// defer test_structure.RunTestStage(t, "teardown", func() {
	// 	terraformOptions := test_structure.LoadTerraformOptions(t, scenario.fixtureFolder)
	// 	terraform.Destroy(t, terraformOptions)
	// })

	test_structure.RunTestStage(t, "validate_workflow_completion", func() {
		terraformOptions := test_structure.LoadTerraformOptions(t, scenario.fixtureFolder)

		runnerLabel := terraform.Output(t, terraformOptions, "runner_label")

		testID := fmt.Sprintf("%s-%d", scenario.name, time.Now().UTC().UnixNano())
		expectedTitle := workflowRunTitle(testID)

		dispatchWorkflow(t, github, githubWorkflowFile, testID, runnerLabel)
		run := waitForWorkflowRun(t, github, githubWorkflowFile, expectedTitle)
		completedRun := waitForWorkflowCompletion(t, github, run.ID)

		if completedRun.Conclusion != "success" {
			t.Fatalf("workflow run %d completed with conclusion %q: %s", completedRun.ID, completedRun.Conclusion, completedRun.HTMLURL)
		}

		assertWorkflowJob(t, github, completedRun.ID, runnerLabel)
	})
}

func loadGitHubConfig(t *testing.T) githubConfig {
	t.Helper()

	return githubConfig{
		owner: githubRepositoryOwner,
		repo:  githubRepositoryName,
		ref:   envOrDefault("E2E_GITHUB_REF", "github_selfhosted_runner_on_container_app_jobs"), // TODO: revert to main
		token: requireEnv(t, "GITHUB_TOKEN", "GH_TOKEN"),
	}
}

func workflowRunTitle(testID string) string {
	return fmt.Sprintf("E2E GitHub Self-Hosted Runner %s", testID)
}

func dispatchWorkflow(t *testing.T, cfg githubConfig, workflowFilename string, testID string, runnerLabel string) {
	t.Helper()

	payload := map[string]any{
		"ref": cfg.ref,
		"inputs": map[string]string{
			"runner_label": runnerLabel,
			"test_id":      testID,
		},
	}

	requestGitHub(t, cfg, http.MethodPost, fmt.Sprintf("/repos/%s/%s/actions/workflows/%s/dispatches", cfg.owner, cfg.repo, url.PathEscape(workflowFilename)), payload, http.StatusNoContent, nil)
}

func waitForWorkflowRun(t *testing.T, cfg githubConfig, workflowFilename string, expectedTitle string) workflowRun {
	t.Helper()

	deadline := time.Now().Add(runTimeout)
	for time.Now().Before(deadline) {
		var runs workflowRunsResponse
		requestGitHub(
			t,
			cfg,
			http.MethodGet,
			fmt.Sprintf("/repos/%s/%s/actions/workflows/%s/runs?event=workflow_dispatch&per_page=20", cfg.owner, cfg.repo, url.PathEscape(workflowFilename)),
			nil,
			http.StatusOK,
			&runs,
		)

		for _, run := range runs.WorkflowRuns {
			if run.DisplayTitle == expectedTitle {
				return run
			}
		}

		time.Sleep(pollInterval)
	}

	t.Fatalf("timed out waiting for workflow run %q to appear", expectedTitle)
	return workflowRun{}
}

func waitForWorkflowCompletion(t *testing.T, cfg githubConfig, runID int64) workflowRun {
	t.Helper()

	deadline := time.Now().Add(runTimeout)
	for time.Now().Before(deadline) {
		var run workflowRun
		requestGitHub(t, cfg, http.MethodGet, fmt.Sprintf("/repos/%s/%s/actions/runs/%d", cfg.owner, cfg.repo, runID), nil, http.StatusOK, &run)

		if run.Status == "completed" {
			return run
		}

		time.Sleep(pollInterval)
	}

	t.Fatalf("timed out waiting for workflow run %d to complete", runID)
	return workflowRun{}
}

func assertWorkflowJob(t *testing.T, cfg githubConfig, runID int64, runnerLabel string) {
	t.Helper()

	var jobs workflowJobsResponse
	requestGitHub(t, cfg, http.MethodGet, fmt.Sprintf("/repos/%s/%s/actions/runs/%d/jobs", cfg.owner, cfg.repo, runID), nil, http.StatusOK, &jobs)

	if len(jobs.Jobs) == 0 {
		t.Fatalf("workflow run %d returned no jobs", runID)
	}

	for _, job := range jobs.Jobs {
		if job.Conclusion == "success" && job.RunnerName != "" && slices.Contains(job.Labels, runnerLabel) {
			return
		}
	}

	t.Fatalf("workflow run %d completed successfully but no job reported the expected runner label %q", runID, runnerLabel)
}

func setKeyVaultSecret(t *testing.T, keyVaultName string, secretName string, secretValue string) {
	t.Helper()

	command := exec.Command("az", "keyvault", "secret", "set", "--vault-name", keyVaultName, "--name", secretName, "--value", secretValue, "--only-show-errors")
	output, err := command.CombinedOutput()
	if err != nil {
		t.Fatalf("set key vault secret %q in %q: %v: %s", secretName, keyVaultName, err, strings.TrimSpace(string(output)))
	}
}

func requestGitHub(t *testing.T, cfg githubConfig, method string, path string, payload any, expectedStatus int, responseBody any) {
	t.Helper()

	var body io.Reader
	if payload != nil {
		encodedPayload, err := json.Marshal(payload)
		if err != nil {
			t.Fatalf("marshal github payload: %v", err)
		}
		body = bytes.NewReader(encodedPayload)
	}

	req, err := http.NewRequest(method, githubAPIBaseURL+path, body)
	if err != nil {
		t.Fatalf("create github request: %v", err)
	}

	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("Authorization", "Bearer "+cfg.token)
	req.Header.Set("X-GitHub-Api-Version", githubAPIVersion)
	req.Header.Set("User-Agent", "pagopa-dx-ghrunner-e2e")
	if payload != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	resp, err := githubHTTPClient.Do(req)
	if err != nil {
		t.Fatalf("execute github request %s %s: %v", method, path, err)
	}
	defer resp.Body.Close()

	responsePayload, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read github response: %v", err)
	}

	if resp.StatusCode != expectedStatus {
		t.Fatalf("github request %s %s returned status %d instead of %d: %s", method, path, resp.StatusCode, expectedStatus, strings.TrimSpace(string(responsePayload)))
	}

	if responseBody != nil && len(responsePayload) > 0 {
		if err := json.Unmarshal(responsePayload, responseBody); err != nil {
			t.Fatalf("decode github response: %v", err)
		}
	}
}

func envOrDefault(name string, fallback string) string {
	value := strings.TrimSpace(os.Getenv(name))
	if value == "" {
		return fallback
	}

	return value
}

func validateRequiredEnv(t *testing.T, groups [][]string) {
	t.Helper()

	missingGroups := make([]string, 0)
	for _, group := range groups {
		if len(group) == 0 {
			continue
		}

		found := false
		for _, name := range group {
			if strings.TrimSpace(os.Getenv(name)) != "" {
				found = true
				break
			}
		}

		if !found {
			missingGroups = append(missingGroups, strings.Join(group, " or "))
		}
	}

	if len(missingGroups) > 0 {
		t.Fatalf("missing required environment variables: %s", strings.Join(missingGroups, "; "))
	}
}

func requireEnv(t *testing.T, names ...string) string {
	t.Helper()

	for _, name := range names {
		if value := strings.TrimSpace(os.Getenv(name)); value != "" {
			return value
		}
	}

	t.Fatalf("missing required environment variable, checked: %s", strings.Join(names, ", "))
	return ""
}
