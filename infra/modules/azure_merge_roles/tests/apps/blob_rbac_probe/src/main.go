package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"

	"github.com/Azure/azure-sdk-for-go/sdk/azidentity"
	"github.com/Azure/azure-sdk-for-go/sdk/storage/azblob"
)

const blobOperationTimeout = 30 * time.Second

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

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("/probe", probeHandler)

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
