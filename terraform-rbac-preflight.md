# Terraform RBAC Preflight in PRs for `infra_plan`

## Context

A recurring problem in Terraform pipelines is that `terraform plan` succeeds,
but the subsequent `terraform apply` fails because the federated identity for
the deploy GitHub Environment is missing permissions.

In the current DX model:

- `infra_plan.yaml` uses the `*-ci` GitHub Environment;
- `infra_apply.yaml` generates a plan in the `tf_plan` job with `*-ci`;
- `infra_apply.yaml` applies the saved plan in the `tf_apply` job with `*-cd`;
- `azure_github_environment_bootstrap` assigns different roles to the CI and CD
  identities;
- since bootstrap version 4.x, many permissions are consolidated into custom
  roles defined by `azure_core_infra`.

`terraform plan` validates state, configuration, and resource readability, but
it does not exhaustively test the write, delete, join/action, and data-plane
operations that the Azure provider will perform during apply.

## Goal

Add a deterministic check already during the PR phase, inside `infra_plan.yaml`,
to verify whether the `*-cd` identity that will run the future apply has the
permissions required by the Terraform plan.

The check must not wait for the merge to `main`: it must fail or report the
issue together with the plan comment, so the PR can also include the permission
remediation.

The check must:

1. read the binary plan that was already produced;
2. convert it to JSON;
3. extract the Azure resources that will be created, modified, or deleted;
4. derive the required Azure RBAC actions;
5. reconstruct the effective permissions of the `*-cd` identity on the involved
   scopes;
6. fail or comment with an actionable message if permissions are missing.

## Recommended choice

Use a deterministic script, not an LLM agent, as the pipeline gate.

The agent can be useful outside the gate for triage and remediation proposals,
for example to suggest which custom role should be updated. The decision to
block or report the PR must instead be repeatable, auditable, and testable.

## Workflow integration point

In the `tf_plan` job of `.github/workflows/infra_plan.yaml`, immediately after
`Terraform Plan` and before publishing the PR comment:

```yaml
env:
  TFPLAN_FILE: tf-outcome-${{ github.sha }}

- name: Terraform Plan
  id: plan
  uses: pagopa/dx/actions/sanitize-terraform-plan@main
  with:
    base-path: ${{ steps.directory.outputs.dir }}
    sensitive-keys: hidden-link,APPINSIGHTS_INSTRUMENTATIONKEY
    no-refresh: ${{ steps.set-refresh-flag.outputs.disable_tf_plan_refresh }}
    plan-file: ${{ env.TFPLAN_FILE }}

- name: Terraform RBAC Preflight
  uses: pagopa/dx/actions/run-dx-task@main
  with:
    task: terraformRbacPreflight
    payload: |
      {
        "modulePath": "${{ steps.directory.outputs.dir }}",
        "planFile": "${{ env.TFPLAN_FILE }}",
        "principalId": "${{ secrets.INFRA_CD_PRINCIPAL_ID }}",
        "subscriptionId": "${{ secrets.ARM_SUBSCRIPTION_ID }}",
        "summaryFile": "rbac_preflight_output.md",
        "mode": "advisory"
      }
```

The job remains authenticated with the `*-ci` identity because it runs in the
plan GitHub Environment. The script therefore must not ask "what can the current
identity do"; instead, it must read Azure role assignments and role definitions
to calculate what the `*-cd` identity will be able to do at apply time.

This requires the plan workflow to know the object ID of the CD identity. The
cleanest option is to have the `azure_github_environment_bootstrap` module expose
a non-sensitive secret or environment variable in the `*-ci` GitHub Environment,
for example:

- `INFRA_CD_PRINCIPAL_ID`;
- optionally `INFRA_CD_CLIENT_ID`, if the principal ID should be resolved via
  Azure AD.

The `principal_id` and `client_id` of a managed identity are not secrets:
security remains in the OIDC trust and Azure role assignments.

If only the client ID is exposed, the script can resolve the principal ID with:

```bash
az ad sp show --id "$INFRA_CD_CLIENT_ID" --query id -o tsv
```

However, exposing `INFRA_CD_PRINCIPAL_ID` directly is preferable to avoid
dependencies on Microsoft Graph/Azure AD permissions in the plan job.

## Script inputs

The script receives:

- the JSON file generated with `terraform show -json`;
- the principal ID of the `*-cd` managed identity to verify;
- an optional execution mode:
  - `strict`: also fails on unmapped Azure resources;
  - `advisory`: reports unmapped resources, but fails only on missing
    permissions for known resources.

Recommended initial mode: `advisory`.

## Algorithm

1. Read `resource_changes[]` from the plan JSON.
2. Ignore resources with only `no-op` actions or non-Azure providers.
3. For each resource change:
   - `create` requires creation/write actions;
   - `update` requires write actions;
   - `delete` requires delete actions;
   - `delete` + `create` requires both delete and creation actions.
4. Resolve the Azure scope:
   - for existing resources, use `change.before.id`;
   - for `azurerm_role_assignment`, use `change.after.scope`;
   - for new resources without a known ID, infer the scope from attributes such
     as `resource_group_name`, `name`, `scope`, `subscription_id`;
   - for resources with cross-scope dependencies, add the secondary scopes from
     the mapping table.
5. Group the required actions by scope.
6. For each scope, read the effective role assignments of the `*-cd` identity,
   including inherited scopes:

```bash
az role assignment list \
  --assignee-object-id "$CD_PRINCIPAL_ID" \
  --scope "$SCOPE" \
  --include-inherited \
  --all \
  --output json
```

7. For each role assignment, read the associated role definition:

```bash
az role definition list \
  --name "$ROLE_DEFINITION_ID_OR_NAME" \
  --output json
```

8. Calculate the union of the `permissions[]` blocks from the role definitions
   applicable to the scope.
9. Check whether each required action is covered by at least one `actions` block
   and is not excluded by `notActions`.
10. Produce a compact report and fail or comment if permissions are missing.

Do not use `Microsoft.Authorization/permissions` for this PR check: that API
returns the permissions of the current caller. In the plan job the caller is
`*-ci`, while the identity to verify is `*-cd`.

## Action matching

Matching must be case-insensitive and support Azure wildcards:

- `Microsoft.Resources/*`;
- `Microsoft.Network/privateEndpoints/*`;
- `*`.

An action is authorized if:

1. at least one allowed action covers it;
2. no `notAction` excludes it.

For data-plane permissions, the same logic must be applied to `dataActions` and
`notDataActions` when the resource requires data-plane permissions.

## Mapping table

The plan JSON does not contain all the calls that the Azure provider will
perform. A versioned mapping table is therefore needed in the repository.

Conceptual example:

```ts
const rules = {
  azurerm_role_assignment: {
    scope: { path: "after.scope" },
    create: ["Microsoft.Authorization/roleAssignments/write"],
    update: ["Microsoft.Authorization/roleAssignments/write"],
    delete: ["Microsoft.Authorization/roleAssignments/delete"],
  },

  azurerm_private_endpoint: {
    scope: { kind: "resourceGroup", namePath: "after.resource_group_name" },
    create: ["Microsoft.Network/privateEndpoints/write"],
    update: ["Microsoft.Network/privateEndpoints/write"],
    delete: ["Microsoft.Network/privateEndpoints/delete"],
    extra: [
      {
        scope: { path: "after.subnet_id" },
        create: ["Microsoft.Network/virtualNetworks/subnets/join/action"],
        update: ["Microsoft.Network/virtualNetworks/subnets/join/action"],
      },
      {
        scope: {
          path: "after.private_dns_zone_group[0].private_dns_zone_ids[]",
        },
        create: ["Microsoft.Network/privateDnsZones/join/action"],
        update: ["Microsoft.Network/privateDnsZones/join/action"],
      },
    ],
  },
};
```

The mapping table should start from the resources that most frequently cause
apply failures.

Initial priority:

1. `azurerm_role_assignment`;
2. `azurerm_resource_group`;
3. `azurerm_private_endpoint`;
4. Private DNS resources;
5. Key Vault secrets, certificates, and keys;
6. Storage accounts, containers, queues, tables, and blobs;
7. Container Apps and Container Apps Jobs;
8. API Management;
9. App Service and Static Web App.

## Report example

```text
Terraform RBAC preflight failed.

Identity:
  infra-prod-cd managed identity
  principal_id: <principal-id>

Missing permission:
  Microsoft.Network/virtualNetworks/subnets/join/action

Scope:
  /subscriptions/<sub>/resourceGroups/<network-rg>/providers/Microsoft.Network/virtualNetworks/<vnet>/subnets/<subnet>

Terraform resource:
  azurerm_private_endpoint.redis

Reason:
  The plan creates or updates a private endpoint that must join the target subnet.

Suggested remediation:
  Ensure the infra CD identity has the DX Infra CD Private Networking role on the
  networking scope, or update azure_core_infra custom roles if this capability is
  intended to be standard for all DX repositories.
```

## Remediation guidance

The script must not automatically modify permissions. It must indicate where to
intervene:

- if the scope is a team resource group not passed to the bootstrap, add its ID
  to `additional_resource_group_ids`;
- if the scope is shared network/private DNS, verify
  `private_dns_zone_resource_group_id` and the private networking role
  assignments;
- if the action is a missing standard DX capability, update the custom roles in
  `infra/modules/azure_core_infra/modules/custom_roles/custom_roles.tf`;
- if it is an exceptional need for a single repository, add a targeted role
  assignment using the `module.bootstrap.identities.*.cd` outputs.

## Known limitations

The check cannot guarantee 100% of provider calls because:

- some providers perform additional reads/writes that are not represented in the
  plan;
- some APIs require `*/join/action` or `*/list/action` permissions that are not
  obvious from the Terraform type;
- data plane and management plane have different RBAC models;
- Azure policies can still deny operations even when RBAC allows the action.

Despite these limitations, the preflight catches in advance the most frequent
class of failures: uncovered scopes and missing actions in custom roles.

## Adoption plan

1. Update `azure_github_environment_bootstrap` to expose
   `INFRA_CD_PRINCIPAL_ID` in the `*-ci` GitHub Environment.
2. Modify `infra_plan.yaml` to save the binary plan through `plan-file` and
   generate the JSON with `terraform show -json`.
3. Implement the script in `advisory` mode and publish the report in the plan
   comment.
4. Enable hard failure for known, high-impact resources:
   `azurerm_role_assignment`, private endpoints, Key Vault, Storage, and resource
   groups.
5. Collect unmapped resources in logs for a few weeks.
6. Extend the mapping table with real cases.
7. Switch to `strict` mode when coverage is sufficient.

## Why not use an agent directly

An agent can reason well about error messages and suggest fixes, but it is not
suitable as a pipeline security condition:

- output is not guaranteed to be stable;
- difficult to test with fixtures;
- difficult to audit;
- possible variability between runs.

The gate must therefore be a deterministic script. The agent can be used as
support after failure, to turn the report into a remediation PR or into a
proposal to update the DX custom roles.
