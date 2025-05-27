#!/bin/bash

RESOURCE_GROUP_NAME=dx-d-itn-tfstate-rg-01
STORAGE_ACCOUNT_NAME=dxditntfstatest01
CONTAINER_NAME=terraform-state

# Create resource group
# az group create --name $RESOURCE_GROUP_NAME --location italynorth

# Create storage account
az storage account create --resource-group $RESOURCE_GROUP_NAME --name $STORAGE_ACCOUNT_NAME --sku Standard_LRS --encryption-services blob --location italynorth

# Create blob container
az storage container create --name $CONTAINER_NAME --account-name $STORAGE_ACCOUNT_NAME --auth-mode login
