# opa-poc — replace modules + provider with policies?
#
# Targets:
#   make test                       # opa unit tests
#   make demo-module                # terraform plan (real Azure) + conftest, expects PASS
#   make demo-compliant             # terraform plan (real Azure) + conftest, expects PASS
#   make demo-non-compliant         # terraform plan (real Azure) + conftest, expects FAIL
#   make compare                    # generate plan summaries for compliant vs dx-modules
#   make lint                       # regal
#   make ci                         # test + lint + demo
#   make clean                      # remove generated terraform artifacts

POLICIES := policies
LIB      := $(POLICIES)/lib

.PHONY: help test demo-module demo-compliant demo-non-compliant compare lint ci clean check-tools

help:
	@awk 'BEGIN{FS=":.*?##"} /^[a-zA-Z_-]+:.*?##/ {printf "  \033[36m%-30s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

check-tools:
	@command -v opa      >/dev/null || { echo "opa not found";      exit 1; }
	@command -v conftest >/dev/null || { echo "conftest not found"; exit 1; }
	@command -v regal    >/dev/null || { echo "regal not found";    exit 1; }
	@command -v terraform >/dev/null || { echo "terraform not found"; exit 1; }

test: check-tools ## Run opa unit tests
	opa test $(POLICIES) -v

demo-module: check-tools ## terraform plan (real Azure) on dx-modules project + conftest
	cd terraform/dx-modules && terraform init -input=false -no-color
	cd terraform/dx-modules && terraform plan  -input=false -no-color -out plan.tfplan
	cd terraform/dx-modules && terraform show -json plan.tfplan > plan.json
	conftest test terraform/dx-modules/plan.json --policy $(POLICIES) --namespace main

demo-compliant: check-tools ## terraform plan (real Azure) on compliant project + conftest
	cd terraform/compliant && terraform init -input=false -no-color
	cd terraform/compliant && terraform plan  -input=false -no-color -out plan.tfplan
	cd terraform/compliant && terraform show -json plan.tfplan > plan.json
	conftest test terraform/compliant/plan.json --policy $(POLICIES) --namespace main

demo-non-compliant: check-tools ## terraform plan (real Azure) on broken project + conftest
	cd terraform/non-compliant && terraform init -input=false -no-color
	cd terraform/non-compliant && terraform plan  -input=false -no-color -out plan.tfplan
	cd terraform/non-compliant && terraform show -json plan.tfplan > plan.json
	-conftest test terraform/non-compliant/plan.json --policy $(POLICIES) --namespace main

compare: check-tools ## Generate plan summaries for compliant and dx-modules
	cd terraform/compliant && terraform init -input=false -no-color
	cd terraform/compliant && terraform plan -input=false -no-color -out plan.tfplan
	cd terraform/compliant && terraform show -json plan.tfplan > plan.json
	cd terraform/dx-modules && terraform init -input=false -no-color
	cd terraform/dx-modules && terraform plan -input=false -no-color -out plan.tfplan
	cd terraform/dx-modules && terraform show -json plan.tfplan > plan.json
	@echo "==> compliant resource types"
	@jq -r '.resource_changes | map(select(((.change.actions // []) | index("create")) != null)) | group_by(.type) | map({type: .[0].type, count: length}) | .[] | "\(.type) \(.count)"' terraform/compliant/plan.json
	@echo ""
	@echo "==> dx-modules resource types"
	@jq -r '.resource_changes | map(select(((.change.actions // []) | index("create")) != null)) | group_by(.type) | map({type: .[0].type, count: length}) | .[] | "\(.type) \(.count)"' terraform/dx-modules/plan.json

lint: check-tools ## Run regal
	regal lint $(POLICIES)

ci: test lint demo ## Full local CI

clean: ## Remove generated terraform artifacts
	rm -rf terraform/*/.terraform terraform/*/.terraform.lock.hcl
	rm -f  terraform/*/plan.tfplan terraform/*/plan.json
