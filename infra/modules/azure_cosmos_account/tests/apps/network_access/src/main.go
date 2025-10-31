package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/Azure/azure-sdk-for-go/sdk/azidentity"
	"github.com/Azure/azure-sdk-for-go/sdk/data/azcosmos"
	"github.com/gruntwork-io/terratest/modules/random"
)

type Item struct {
	Id   string `json:"id"`
	Name string `json:"name"`
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

const cosmosOperationTimeout = 4 * time.Second

func probeHandler(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()

	endpoint := fmt.Sprintf("https://%s.documents.azure.com:443", q.Get("endpoint"))
	dbName := q.Get("db")
	containerName := q.Get("container")

	if endpoint == "" || dbName == "" || containerName == "" {
		http.Error(w, `{"status":"fail","error":"missing required query params: endpoint, db, container"}`, http.StatusBadRequest)
		return
	}

	itemID := strconv.Itoa(random.Random(1, 1000))

	ctx, cancel := context.WithTimeout(r.Context(), cosmosOperationTimeout)
	defer cancel()

	cred, err := azidentity.NewDefaultAzureCredential(nil)
	if err != nil {
		fail(w, "credential error", err)
		return
	}

	client, err := azcosmos.NewClient(endpoint, cred, nil)
	if err != nil {
		fail(w, "client error", err)
		return
	}

	db, err := client.NewDatabase(dbName)
	if err != nil {
		fail(w, "db ref error", err)
		return
	}

	c, err := db.NewContainer(containerName)
	if err != nil {
		fail(w, "container ref error", err)
		return
	}

	item := Item{
		Id:   itemID,
		Name: "probe",
	}
	body, err := json.Marshal(item)
	if err != nil {
		fail(w, "marshal error", err)
		return
	}
	pk := azcosmos.NewPartitionKeyString(itemID)

	_, err = c.UpsertItem(ctx, pk, body, nil)
	if err != nil {
		fail(w, "upsert error", err)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status":"ok"}`))
}

func fail(w http.ResponseWriter, msg string, err error) {
	log.Printf("%s: %v", msg, err)
	w.WriteHeader(http.StatusBadRequest)
	w.Write([]byte(`{"status":"fail","error":"` + msg + `"}`))
}
