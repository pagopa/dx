# Test Applications (tests/apps/)

**Purpose**: Containerized applications that test module functionality at runtime. These apps **expose HTTP APIs that are called by E2E tests** to verify end-to-end behavior.

## Structure

```bash
tests/apps/<scenario_name>/
├── Dockerfile          # Multi-stage build
├── project.json        # Nx project configuration
├── README.md          # App documentation
└── src/
    ├── go.mod
    └── main.go        # Test application code
```

## Application Pattern

- Simple HTTP server with test endpoints
- Use Azure SDKs with DefaultAzureCredential
- Accept configuration via query parameters or environment variables
- Return structured JSON responses (e.g., `{"status":"ok"}` or `{"status":"fail","error":"..."}`)
- Handle timeouts appropriately
- **API contract must match what E2E tests expect** (E2E tests call these APIs)

## Example main.go

```go
package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/Azure/azure-sdk-for-go/sdk/azidentity"
	// Import relevant Azure SDK packages
)

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("/probe", probeHandler)

	addr := ":8080"
	log.Printf("listening on %s", addr)
	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Printf("listen error: %s", err)
	}
}

func probeHandler(w http.ResponseWriter, r *http.Request) {
	resourceName := r.URL.Query().Get("resource")

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	credential, err := azidentity.NewDefaultAzureCredential(nil)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		fmt.Fprintf(w, `{"status":"fail","error":"%s"}`, err.Error())
		return
	}

	// Test the Azure service
	err = testService(ctx, credential, resourceName)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		fmt.Fprintf(w, `{"status":"fail","error":"%s"}`, err.Error())
		return
	}

	w.WriteHeader(http.StatusOK)
	fmt.Fprintf(w, `{"status":"ok"}`)
}
```
