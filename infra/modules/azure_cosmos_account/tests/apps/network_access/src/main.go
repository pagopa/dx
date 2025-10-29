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

func probeHandler(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()

	endpoint := fmt.Sprintf("https://%s.documents.azure.com:443", q.Get("endpoint"))
	dbName := q.Get("db")
	containerName := q.Get("container")

	if endpoint == "" || dbName == "" || containerName == "" {
		http.Error(w, `{"status":"fail","error":"missing required query params: endpoint, db, container"}`, http.StatusBadRequest)
		return
	}

	itemID := strconv.Itoa(random.Random(01, 1000))

	ctx, cancel := context.WithTimeout(r.Context(), 4*time.Second)
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
	body, _ := json.Marshal(item)
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
