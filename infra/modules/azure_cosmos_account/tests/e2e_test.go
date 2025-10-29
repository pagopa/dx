package test

import (
	"encoding/json"
	"testing"

	"github.com/Azure/azure-sdk-for-go/sdk/azidentity"
	"github.com/Azure/azure-sdk-for-go/sdk/data/azcosmos"
	"github.com/gruntwork-io/terratest/modules/azure"
	"github.com/gruntwork-io/terratest/modules/terraform"
	"github.com/stretchr/testify/assert"
)

type Item struct {
	Id        string  `json:"id"`
	Category  string  `json:"category"`
	Name      string  `json:"name"`
	Quantity  int     `json:"quantity"`
	Price     float64 `json:"price"`
	Clearance bool    `json:"clearance"`
}

func TestCosmosDBAccess(t *testing.T) {
	terraformOptions := terraform.WithDefaultRetryableErrors(t, &terraform.Options{
		TerraformDir: "../examples/access",
	})

	defer terraform.Destroy(t, terraformOptions)
	assert.True(t, true)

	terraform.InitAndApply(t, terraformOptions)

	credentials, err := azidentity.NewDefaultAzureCredential(nil)
	assert.NoError(t, err)

	subscriptionID := "35e6e3b2-4388-470e-a1b9-ad3bc34326d1" // terraform.Output(t, terraformOptions, "subscription_id")
	resourceGroupName := "dx-d-itn-e2e-cdb-rg-01"            // terraform.Output(t, terraformOptions, "resource_group_name")
	accountName := "dx-d-itn-public-e2e-cosno-01"            // terraform.Output(t, terraformOptions, "account_name")

	cosmosAccount := azure.GetCosmosDBAccount(t, subscriptionID, resourceGroupName, accountName)
	// assert.Equal(t, accountName, *cosmosAccount.Name)
	// // assert.Equal(t, azcosmos.DatabaseAccountKindGlobalDocumentDB, cosmosAccount.Kind, "unexpected type")

	client, err := azcosmos.NewClient(accountName, credentials, nil)
	assert.NoError(t, err)

	dbClient, err := client.NewDatabase("db")
	assert.NoError(t, err)

	containerClient, err := dbClient.NewContainer("items")
	assert.NoError(t, err)

	item := Item{
		Id:        "aaaaaaaa-0000-1111-2222-bbbbbbbbbbbb",
		Category:  "gear-surf-surfboards",
		Name:      "Yamba Surfboard",
		Quantity:  12,
		Price:     850.00,
		Clearance: false,
	}

	partitionKey := azcosmos.NewPartitionKeyString("pk")
	itemBytes, err := json.Marshal(item)
	assert.NoError(t, err)

	resp, err := containerClient.UpsertItem(t.Context(), partitionKey, itemBytes, nil)
	assert.NoError(t, err)

	assert.True(t, resp.RawResponse.StatusCode == 201 || resp.RawResponse.StatusCode == 200, "unexpected status code")
}
