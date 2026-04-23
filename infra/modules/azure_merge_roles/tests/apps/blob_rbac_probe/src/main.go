package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/Azure/azure-sdk-for-go/sdk/azidentity"
	"github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/storage/armstorage"
	"github.com/Azure/azure-sdk-for-go/sdk/storage/azblob"
)

const blobOperationTimeout = 30 * time.Second
const controlPlaneOperationTimeout = 2 * time.Minute

type operationResult struct {
	Success bool   `json:"success"`
	Error   string `json:"error,omitempty"`
	Content string `json:"content,omitempty"`
}

type probeResponse struct {
	Status   string          `json:"status"`
	BlobName string          `json:"blob_name"`
	Write    operationResult `json:"write"`
	Read     operationResult `json:"read"`
	Delete   operationResult `json:"delete"`
}

type managementProbeResponse struct {
	Status        string          `json:"status"`
	ContainerName string          `json:"container_name"`
	Write         operationResult `json:"write"`
	Read          operationResult `json:"read"`
	Delete        operationResult `json:"delete"`
}

type storageAccountResource struct {
	SubscriptionID string
	ResourceGroup  string
	StorageAccount string
}

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("/probe", probeHandler)
	mux.HandleFunc("/management-probe", managementProbeHandler)

	addr := ":8080"
	log.Printf("listening on %s", addr)
	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatal(err)
	}
}

func probeHandler(w http.ResponseWriter, r *http.Request) {
	storageAccountName := r.URL.Query().Get("account")
	containerName := r.URL.Query().Get("container")

	if storageAccountName == "" || containerName == "" {
		http.Error(w, `{"status":"fail","error":"missing required query params: account, container"}`, http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), blobOperationTimeout)
	defer cancel()

	credential, err := azidentity.NewDefaultAzureCredential(nil)
	if err != nil {
		fail(w, http.StatusInternalServerError, "credential error", err)
		return
	}

	accountURL := fmt.Sprintf("https://%s.blob.core.windows.net/", storageAccountName)
	client, err := azblob.NewClient(accountURL, credential, nil)
	if err != nil {
		fail(w, http.StatusBadRequest, "client error", err)
		return
	}

	blobName := fmt.Sprintf("probe-%d.txt", time.Now().UnixNano())
	blobContent := fmt.Sprintf("probe:%s", blobName)

	response := probeResponse{
		Status:   "ok",
		BlobName: blobName,
	}

	_, err = client.UploadBuffer(ctx, containerName, blobName, []byte(blobContent), nil)
	if err != nil {
		fail(w, http.StatusBadRequest, "upload error", err)
		return
	}
	response.Write = operationResult{Success: true}

	download, err := client.DownloadStream(ctx, containerName, blobName, nil)
	if err != nil {
		fail(w, http.StatusBadRequest, "download error", err)
		return
	}

	retryReader := download.NewRetryReader(ctx, nil)
	body, err := io.ReadAll(retryReader)
	if err != nil {
		_ = retryReader.Close()
		fail(w, http.StatusBadRequest, "read error", err)
		return
	}
	if err := retryReader.Close(); err != nil {
		fail(w, http.StatusBadRequest, "reader close error", err)
		return
	}
	response.Read = operationResult{Success: true, Content: string(body)}

	_, err = client.DeleteBlob(ctx, containerName, blobName, nil)
	if err != nil {
		response.Delete = operationResult{Success: false, Error: err.Error()}
		writeJSON(w, http.StatusOK, response)
		return
	}
	response.Delete = operationResult{Success: true}

	writeJSON(w, http.StatusOK, response)
}

func managementProbeHandler(w http.ResponseWriter, r *http.Request) {
	storageAccountID := r.URL.Query().Get("account_id")

	if storageAccountID == "" {
		http.Error(w, `{"status":"fail","error":"missing required query param: account_id"}`, http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), controlPlaneOperationTimeout)
	defer cancel()

	credential, err := azidentity.NewDefaultAzureCredential(nil)
	if err != nil {
		fail(w, http.StatusInternalServerError, "credential error", err)
		return
	}

	storageAccount, err := parseStorageAccountID(storageAccountID)
	if err != nil {
		fail(w, http.StatusBadRequest, "invalid storage account id", err)
		return
	}

	containersClient, err := armstorage.NewBlobContainersClient(storageAccount.SubscriptionID, credential, nil)
	if err != nil {
		fail(w, http.StatusInternalServerError, "blob containers client error", err)
		return
	}

	containerName := fmt.Sprintf("probe-mgmt-%d", time.Now().UnixNano())
	response := managementProbeResponse{
		Status:        "ok",
		ContainerName: containerName,
	}

	_, err = containersClient.Create(ctx, storageAccount.ResourceGroup, storageAccount.StorageAccount, containerName, armstorage.BlobContainer{}, nil)
	if err != nil {
		fail(w, http.StatusBadRequest, "control-plane create error", err)
		return
	}
	response.Write = operationResult{Success: true}

	_, err = containersClient.Get(ctx, storageAccount.ResourceGroup, storageAccount.StorageAccount, containerName, nil)
	if err != nil {
		fail(w, http.StatusBadRequest, "control-plane read error", err)
		return
	}
	response.Read = operationResult{Success: true}

	_, err = containersClient.Delete(ctx, storageAccount.ResourceGroup, storageAccount.StorageAccount, containerName, nil)
	if err != nil {
		response.Delete = operationResult{Success: false, Error: err.Error()}
		writeJSON(w, http.StatusOK, response)
		return
	}
	response.Delete = operationResult{Success: true}

	writeJSON(w, http.StatusOK, response)
}

func parseStorageAccountID(resourceID string) (storageAccountResource, error) {
	trimmed := strings.Trim(strings.TrimSpace(resourceID), "/")
	parts := strings.Split(trimmed, "/")

	if len(parts) < 8 {
		return storageAccountResource{}, fmt.Errorf("unexpected storage account resource ID shape: %q", resourceID)
	}

	for index := 0; index < len(parts)-1; index++ {
		if strings.EqualFold(parts[index], "subscriptions") && index+1 < len(parts) {
			result := storageAccountResource{
				SubscriptionID: parts[index+1],
			}

			for innerIndex := index + 2; innerIndex < len(parts)-1; innerIndex++ {
				switch {
				case strings.EqualFold(parts[innerIndex], "resourceGroups") && innerIndex+1 < len(parts):
					result.ResourceGroup = parts[innerIndex+1]
				case strings.EqualFold(parts[innerIndex], "storageAccounts") && innerIndex+1 < len(parts):
					result.StorageAccount = parts[innerIndex+1]
				}
			}

			if result.SubscriptionID == "" || result.ResourceGroup == "" || result.StorageAccount == "" {
				return storageAccountResource{}, fmt.Errorf("incomplete storage account resource ID: %q", resourceID)
			}

			return result, nil
		}
	}

	return storageAccountResource{}, fmt.Errorf("could not parse storage account resource ID: %q", resourceID)
}

func fail(w http.ResponseWriter, statusCode int, message string, err error) {
	log.Printf("%s: %v", message, err)
	writeJSON(w, statusCode, map[string]string{
		"status": "fail",
		"error":  fmt.Sprintf("%s: %v", message, err),
	})
}

func writeJSON(w http.ResponseWriter, statusCode int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		log.Printf("encode error: %v", err)
	}
}
