# Module Discovery

Use this workflow before writing any raw Terraform resource.

## Inputs to Collect

- The target cloud provider and service.
- The target repository folder and environment.
- The resource capabilities requested by the user.
- Existing module calls in the target area.

## Discovery Steps

1. List available DX modules under `infra/modules/` in the DX knowledge base.
2. For each resource you intend to create, search module names, READMEs, `variables.tf`, `outputs.tf`, `main.tf`, and `examples/` for a matching module.
3. For broad changes with multiple independent resources, consider parallelizing those per-resource searches.
4. For each candidate module, inspect source rather than relying on summaries:
   - `README.md`
   - `variables.tf`
   - `outputs.tf`
   - `main.tf`
   - supporting `.tf` files
   - `examples/`
   - `package.json`
5. Build a capability map from the source:
   - supported `use_case` values and their intended environments
   - optional variables and defaults
   - nested object/list fields
   - validation constraints
   - generated resources and IAM/RBAC behavior
   - examples showing common configurations
6. If a module covers the capability, use it instead of raw `azurerm_*` or `aws_*` resources.
7. Pin the module version with `~> major.minor`, deriving the version from `package.json`.
8. Use raw provider resources only for capabilities not covered by DX modules, and explain why.

## Commonly Missed Module Categories

Always search for modules related to:

- role assignments and IAM/RBAC
- Service Bus and Event Hub
- CDN and API Management
- Container Apps and Function Apps
- storage and data services
- monitoring and diagnostics
- networking, private endpoints, DNS, and subnet allocation

## Capability Questions

Ask about a capability only when it affects behavior and cannot be inferred.

For each user-facing option:

1. Explain what it controls.
2. Explain the default behavior.
3. Explain what changes if it is enabled, disabled, or changed.
4. Offer known choices when possible.
5. Ask follow-up questions only for fields required by the selected option.

Example for a module `use_case`:

| use_case | Description | Production fit |
| --- | --- | --- |
| `development` | Cost-efficient configuration for development or testing. | No |
| `default` | Production-oriented defaults for predictable behavior. | Yes |

Ask: "Which `use_case` best fits this environment?"
