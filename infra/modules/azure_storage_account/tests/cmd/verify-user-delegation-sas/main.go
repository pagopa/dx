// Command verify-user-delegation-sas proves the delegated_access example can
// mint a User Delegation SAS and use that signed URL for blob upload/download.
package main

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/Azure/azure-sdk-for-go/sdk/azidentity"
	"github.com/Azure/azure-sdk-for-go/sdk/storage/azblob"
	"github.com/Azure/azure-sdk-for-go/sdk/storage/azblob/sas"
	"github.com/Azure/azure-sdk-for-go/sdk/storage/azblob/service"
)

const clockSkewWindow = 5 * time.Minute

var errHelpRequested = errors.New("help requested")

type delegatedAccessConfig struct {
	accountName     string
	containerName   string
	blobName        string
	sasDuration     time.Duration
	serviceURL      string
	blobURL         string
	sasServiceURL   string
	uploadedContent string
}

type verifierResponse struct {
	Status            string `json:"status"`
	Error             string `json:"error,omitempty"`
	BlobName          string `json:"blobName,omitempty"`
	BlobURL           string `json:"blobUrl,omitempty"`
	UploadedContent   string `json:"uploadedContent,omitempty"`
	DownloadedContent string `json:"downloadedContent,omitempty"`
}

func main() {
	if err := run(os.Args[1:], os.Stdout); err != nil {
		writeResponse(os.Stdout, verifierResponse{
			Status: "error",
			Error:  err.Error(),
		})
		os.Exit(1)
	}
}

func run(args []string, stdout io.Writer) error {
	config, err := parseConfig(args)
	if err != nil {
		if errors.Is(err, errHelpRequested) {
			printUsage(stdout)
			return nil
		}

		return err
	}

	ctx := context.Background()
	response, err := verifyDelegatedAccess(ctx, config)
	if err != nil {
		return err
	}

	writeResponse(stdout, response)
	return nil
}

func parseConfig(args []string) (delegatedAccessConfig, error) {
	normalizedArgs := args
	if len(normalizedArgs) > 0 && normalizedArgs[0] == "--" {
		normalizedArgs = normalizedArgs[1:]
	}

	flagSet := flag.NewFlagSet("verify-user-delegation-sas", flag.ContinueOnError)
	flagSet.SetOutput(io.Discard)

	accountName := flagSet.String("account-name", strings.TrimSpace(os.Getenv("AZURE_STORAGE_ACCOUNT_NAME")), "Azure Storage Account name")
	containerName := flagSet.String("container-name", strings.TrimSpace(os.Getenv("AZURE_STORAGE_CONTAINER_NAME")), "Azure Blob container name")
	blobName := flagSet.String("blob-name", strings.TrimSpace(os.Getenv("AZURE_STORAGE_BLOB_NAME")), "Blob name to create via the SAS URL")
	sasDurationMinutes := flagSet.Int("sas-duration-minutes", 15, "User Delegation SAS duration in minutes")
	help := flagSet.Bool("help", false, "Show usage")
	flagSet.BoolVar(help, "h", false, "Show usage")

	if err := flagSet.Parse(normalizedArgs); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return delegatedAccessConfig{}, errHelpRequested
		}

		return delegatedAccessConfig{}, fmt.Errorf("invalid delegated access configuration: %w", err)
	}

	if *help {
		return delegatedAccessConfig{}, errHelpRequested
	}

	trimmedAccountName := strings.TrimSpace(*accountName)
	trimmedContainerName := strings.TrimSpace(*containerName)
	trimmedBlobName := strings.TrimSpace(*blobName)

	if trimmedBlobName == "" {
		randomSuffix, err := randomHex(8)
		if err != nil {
			return delegatedAccessConfig{}, fmt.Errorf("could not generate blob name: %w", err)
		}

		trimmedBlobName = fmt.Sprintf("delegated-access-%s.txt", randomSuffix)
	}

	switch {
	case len(trimmedAccountName) < 3:
		return delegatedAccessConfig{}, errors.New("invalid delegated access configuration: account-name is required")
	case len(trimmedContainerName) < 3:
		return delegatedAccessConfig{}, errors.New("invalid delegated access configuration: container-name is required")
	case trimmedBlobName == "":
		return delegatedAccessConfig{}, errors.New("invalid delegated access configuration: blob-name cannot be empty")
	case *sasDurationMinutes < 1 || *sasDurationMinutes > 60:
		return delegatedAccessConfig{}, errors.New("invalid delegated access configuration: sas-duration-minutes must be between 1 and 60")
	}

	serviceURL := fmt.Sprintf("https://%s.blob.core.windows.net/", trimmedAccountName)
	blobURL := buildBlobURL(trimmedAccountName, trimmedContainerName, trimmedBlobName)

	return delegatedAccessConfig{
		accountName:   trimmedAccountName,
		containerName: trimmedContainerName,
		blobName:      trimmedBlobName,
		sasDuration:   time.Duration(*sasDurationMinutes) * time.Minute,
		serviceURL:    serviceURL,
		blobURL:       blobURL,
	}, nil
}

func verifyDelegatedAccess(ctx context.Context, config delegatedAccessConfig) (verifierResponse, error) {
	credential, err := azidentity.NewDefaultAzureCredential(nil)
	if err != nil {
		return verifierResponse{}, fmt.Errorf("could not create DefaultAzureCredential: %w", err)
	}

	serviceClient, err := service.NewClient(config.serviceURL, credential, nil)
	if err != nil {
		return verifierResponse{}, fmt.Errorf("could not create blob service client: %w", err)
	}

	privilegedClient, err := azblob.NewClient(config.serviceURL, credential, nil)
	if err != nil {
		return verifierResponse{}, fmt.Errorf("could not create privileged blob client: %w", err)
	}

	now := time.Now().UTC()
	startsOn := now.Add(-clockSkewWindow)
	expiresOn := now.Add(config.sasDuration)

	userDelegationCredential, err := serviceClient.GetUserDelegationCredential(
		ctx,
		service.KeyInfo{
			Start:  stringPtr(startsOn.Format(sas.TimeFormat)),
			Expiry: stringPtr(expiresOn.Format(sas.TimeFormat)),
		},
		nil,
	)
	if err != nil {
		return verifierResponse{}, fmt.Errorf("could not get user delegation credential: %w", err)
	}

	queryParameters, err := sas.BlobSignatureValues{
		Protocol:      sas.ProtocolHTTPS,
		StartTime:     startsOn,
		ExpiryTime:    expiresOn,
		Permissions:   (&sas.BlobPermissions{Read: true, Create: true, Write: true}).String(),
		ContainerName: config.containerName,
		BlobName:      config.blobName,
	}.SignWithUserDelegation(userDelegationCredential)
	if err != nil {
		return verifierResponse{}, fmt.Errorf("could not sign user delegation SAS: %w", err)
	}

	sasServiceURL := fmt.Sprintf("%s?%s", strings.TrimSuffix(config.serviceURL, "/"), queryParameters.Encode())
	sasClient, err := azblob.NewClientWithNoCredential(sasServiceURL, nil)
	if err != nil {
		return verifierResponse{}, fmt.Errorf("could not create SAS blob client: %w", err)
	}

	randomSuffix, err := randomHex(12)
	if err != nil {
		return verifierResponse{}, fmt.Errorf("could not generate upload marker: %w", err)
	}

	uploadedContent := fmt.Sprintf("delegated-access:%s:%s", config.blobName, randomSuffix)

	defer func() {
		_, _ = privilegedClient.DeleteBlob(ctx, config.containerName, config.blobName, nil)
	}()

	if _, err := sasClient.UploadBuffer(ctx, config.containerName, config.blobName, []byte(uploadedContent), nil); err != nil {
		return verifierResponse{}, fmt.Errorf("could not upload blob through SAS URL: %w", err)
	}

	downloadResponse, err := sasClient.DownloadStream(ctx, config.containerName, config.blobName, nil)
	if err != nil {
		return verifierResponse{}, fmt.Errorf("could not download blob through SAS URL: %w", err)
	}

	retryReader := downloadResponse.NewRetryReader(ctx, nil)
	defer func() {
		_ = retryReader.Close()
	}()

	downloadedContent, err := io.ReadAll(retryReader)
	if err != nil {
		return verifierResponse{}, fmt.Errorf("could not read downloaded blob content: %w", err)
	}

	downloadedText := string(downloadedContent)
	if downloadedText != uploadedContent {
		return verifierResponse{}, fmt.Errorf(
			"downloaded content mismatch: expected %q but got %q",
			uploadedContent,
			downloadedText,
		)
	}

	return verifierResponse{
		Status:            "ok",
		BlobName:          config.blobName,
		BlobURL:           config.blobURL,
		UploadedContent:   uploadedContent,
		DownloadedContent: downloadedText,
	}, nil
}

func buildBlobURL(accountName string, containerName string, blobName string) string {
	return (&url.URL{
		Scheme: "https",
		Host:   fmt.Sprintf("%s.blob.core.windows.net", accountName),
		Path:   fmt.Sprintf("/%s/%s", containerName, blobName),
	}).String()
}

func writeResponse(writer io.Writer, response verifierResponse) {
	encodedResponse, _ := json.MarshalIndent(response, "", "  ")
	_, _ = fmt.Fprintln(writer, string(encodedResponse))
}

func printUsage(writer io.Writer) {
	_, _ = fmt.Fprintln(writer, "Usage: go run ./cmd/verify-user-delegation-sas --account-name <name> --container-name <name> [--blob-name <name>] [--sas-duration-minutes <1-60>]")
	_, _ = fmt.Fprintln(writer)
	_, _ = fmt.Fprintln(writer, "Environment fallbacks:")
	_, _ = fmt.Fprintln(writer, "  AZURE_STORAGE_ACCOUNT_NAME")
	_, _ = fmt.Fprintln(writer, "  AZURE_STORAGE_CONTAINER_NAME")
	_, _ = fmt.Fprintln(writer, "  AZURE_STORAGE_BLOB_NAME")
	_, _ = fmt.Fprintln(writer, "  AZURE_STORAGE_SAS_DURATION_MINUTES")
	_, _ = fmt.Fprintln(writer, "  AZURE_CLIENT_ID")
}

func randomHex(bytesLength int) (string, error) {
	buffer := make([]byte, bytesLength)
	if _, err := rand.Read(buffer); err != nil {
		return "", err
	}

	return hex.EncodeToString(buffer), nil
}

func stringPtr(value string) *string {
	return &value
}