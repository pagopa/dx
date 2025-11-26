package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/Azure/AppConfiguration-GoProvider/azureappconfiguration"
	"github.com/Azure/azure-sdk-for-go/sdk/azidentity"
)

type Config struct {
	TestKey string `json:"test-key"`
}

type Secret struct {
	SecretKey string `json:"secret-key"`
}

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("/setting", settingHandler)
	mux.HandleFunc("/secret", secretHandler)

	addr := ":8080"
	log.Printf("listening on %s", addr)
	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Printf("listen error: %s", err)
	}
}

func settingHandler(w http.ResponseWriter, r *http.Request) {
	hostname := getHostnameFromQueryString(r)

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	provider, err := loadAzureAppConfiguration(ctx, hostname, false)
	if err != nil {
		log.Printf("Failed to load Azure App Configuration: %v", err)
		w.WriteHeader(http.StatusBadGateway)
		return
	}

	var config Config
	if err := provider.Unmarshal(&config, nil); err != nil {
		log.Printf("Failed to unmarshal configuration: %v", err)
	}

	w.WriteHeader(http.StatusOK)
	fmt.Fprintf(w, `{"key":"%s"}`, config.TestKey)
}

func secretHandler(w http.ResponseWriter, r *http.Request) {
	hostname := getHostnameFromQueryString(r)

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	provider, err := loadAzureAppConfiguration(ctx, hostname, true)
	if err != nil {
		log.Printf("Failed to load Azure App Configuration: %v", err)
		w.WriteHeader(http.StatusBadGateway)
		return
	}

	var secret Secret
	if err := provider.Unmarshal(&secret, nil); err != nil {
		log.Printf("Failed to unmarshal configuration: %v", err)
	}

	w.WriteHeader(http.StatusOK)
	fmt.Fprintf(w, `{"secret-key":"%s"}`, secret.SecretKey)
}

func getHostnameFromQueryString(r *http.Request) string {
	q := r.URL.Query()
	instanceName := q.Get("instanceName")
	return fmt.Sprintf("%s.azconfig.io", instanceName)
}

func loadAzureAppConfiguration(ctx context.Context, hostname string, enableSecret bool) (*azureappconfiguration.AzureAppConfiguration, error) {
	credential, err := azidentity.NewDefaultAzureCredential(nil)
	if err != nil {
		log.Printf("Failed to create credential: %v", err)
	}

	authOptions := azureappconfiguration.AuthenticationOptions{
		Endpoint:   fmt.Sprintf("https://%s", hostname),
		Credential: credential,
	}

	keyFilter := "Setting"
	if enableSecret {
		keyFilter = "Secret"
	}

	options := &azureappconfiguration.Options{
		Selectors: []azureappconfiguration.Selector{
			{
				KeyFilter: fmt.Sprintf("%s:*", keyFilter),
			},
		},
		TrimKeyPrefixes: []string{fmt.Sprintf("%s:", keyFilter)},
	}

	if enableSecret {
		options.KeyVaultOptions = azureappconfiguration.KeyVaultOptions{
			Credential: credential,
		}
	}

	return azureappconfiguration.Load(ctx, authOptions, options)
}
