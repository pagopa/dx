# Checklist Questions

Questions the agent asks during **Step 3** of the workflow. The checklist has two layers:
**fixed core questions** (always asked) and **dynamic capability questions** (generated
from the module's `variables.tf` after Step 2).

## Fixed Core Questions (Always Ask)

These determine which modules to use. Ask them first.

### Q1: Application Type

> What type of application are you deploying?

| Choice | Typical modules |
|---|---|
| **Web application** (Next.js, Express, Spring Boot) | `azure-container-app` or `azure-app-service` |
| **REST API** (backend service) | `azure-container-app` or `azure-function-app` |
| **Background worker** (queue processor, scheduled jobs) | `azure-container-app` or `azure-function-app` |
| **Static website** (React SPA, docs site) | `azure-storage-account` + `azure-cdn` |
| **Event-driven function** (webhooks, triggers) | `azure-function-app` or `azure-function-app-exposed` |

### Q2: Compute Platform

> Which compute platform do you want to use?

If the user is unsure, guide them:

- **Container App**: Best for containerized apps. Supports custom domains, autoscaling, sidecars. Recommended for most new workloads.
- **App Service**: Best for traditional PaaS. Supports deployment slots, built-in CI/CD.
- **Function App**: Best for event-driven, pay-per-execution workloads. Supports timers, queues, HTTP triggers.

### Q3: Environment

> Which environment is this for?

| Choice | `env_short` | Implications |
|---|---|---|
| **Development** | `d` | Smaller SKUs, no replicas, relaxed security |
| **UAT** | `u` | Production-like config, may skip HA |
| **Production** | `p` | Full HA, geo-redundancy, alerts, strict networking |

### Q4: Data Layer

> Does the application need a database?

| Choice | Module |
|---|---|
| **PostgreSQL** | `azure-postgres-server` |
| **Cosmos DB** (NoSQL) | `azure-cosmos-account` |
| **None** | Skip database configuration |

---

## Dynamic Capability Questions (Generated from Modules)

After the core questions identify the relevant modules, **read each module's
`variables.tf`** and generate questions for each optional capability.

### How to Generate Questions

For each optional variable (one with a `default` value) in the module:

1. **Read** the variable's `description`, `type`, `default`, and `validation` blocks
2. **Classify** it as a capability the user can enable/disable
3. **Formulate** a question that explains the capability in plain language
4. **Include** the default behavior ("if you skip this, the module will...")
5. **If enabled**, ask follow-up questions for sub-fields

### Question Generation Template

```
Capability: {variable_name}
Question:   "{description_in_plain_language}?"
Default:    "{what happens if unconfigured}"
Follow-ups: [one per required sub-field if enabled]
```

### Example: Questions Generated from `azure-container-app` variables.tf

After reading the module, the agent generates:

---

**From `public_access_enabled` (bool, default: true)**

> Should the application be accessible from the internet?
> _(Default: yes — the app gets a public FQDN)_

---

**From `custom_domain` (object, default: null)**

> Do you want a custom domain? (e.g., `api.myapp.pagopa.it`)
> _(Default: no — the app uses the Azure-generated `.azurecontainerapps.io` URL)_

If yes → follow-ups:
- What hostname? (e.g., `api.myapp.pagopa.it`)
- Should the module manage DNS records automatically? If yes:
  - DNS zone name? (e.g., `myapp.pagopa.it`)
  - DNS zone resource group?

---

**From `authentication` (object, default: null)**

> Does the app need user login via Microsoft Entra ID?
> _(Default: no authentication — all requests pass through)_

If yes → follow-ups:
- Entra ID application (client) ID?
- Tenant ID?
- Where is the client secret stored? (Key Vault secret versionless_id)

---

**From `secrets` (list, default: [])**

> Does the app need to read secrets from Key Vault at runtime?
> _(Default: no secrets — only plain environment variables)_

If yes → follow-ups:
- Which secrets? (name + Key Vault secret ID for each)
- **Auto-detected**: if secrets are used, the agent also wires up `azure-role-assignments` with `key_vault.secrets = "reader"` — this is not a question, it's automatic.

---

**From `autoscaler` (object, default: null)**

> How should the application scale?
> _(Default: 1–8 replicas based on the use_case)_

Choices:
- Fixed replicas (set min/max)
- HTTP-based (scale on concurrent requests)
- Queue-based (scale on queue length)
- Custom KEDA scaler

---

**From `size` (object, default: null)**

> Do you want custom CPU/memory sizing?
> _(Default: determined by use_case — typically 1.25 CPU / 2.5Gi)_

If yes → the agent must enforce the validation: **memory = cpu × 2**, CPU between 0.25 and 4.

---

**From `diagnostic_settings` (object, default: {enabled: false})**

> Do you want to enable diagnostic logging to Log Analytics?
> _(Default: disabled)_
> _(Recommended for production)_

If yes → follow-up: Log Analytics workspace ID?

---

### Example: Questions Generated from `azure-postgres-server` variables.tf

---

**From `create_replica` (bool, default: true)**

> Do you need a read replica for the database?
> _(Default: yes — recommended for production to offload read queries)_
> _(For dev/test, you can disable this to save cost)_

---

**From `key_vault_id` (string, optional)**

> Should the module store the database admin password in Key Vault automatically?
> _(Recommended: yes — the password never touches Terraform state)_

---

**From `db_version` (string, default: "16")**

> Which PostgreSQL version? (default: 16)

---

### Implicit Capabilities (Don't Ask, Just Do)

Some capabilities are **always required** and should not be presented as questions.
The agent wires them automatically:

| Capability | Auto-configured when... |
|---|---|
| **Role assignments** | Any secret or data access is configured → add `azure-role-assignments` |
| **Private endpoints** | Private modules selected → ensure `subnet_pep_id` is provided |
| **Managed identity** | Key Vault / data access needed → wire `user_assigned_identity_id` |
| **Write-only secrets** | Any `azurerm_key_vault_secret` → use `value_wo` + `value_wo_version` |
| **Tags** | Always required → use the project's tag convention |

## Question Flow

```
[Fixed Core Questions]
  Q1 App Type → determines candidate modules
  Q2 Compute Platform → selects primary module
  Q3 Environment → affects defaults (HA, replicas, size)
  Q4 Data Layer → adds data module(s)
          │
          ▼
[Agent reads variables.tf for selected modules]
          │
          ▼
[Dynamic Capability Questions]
  For each optional variable:
    → Explain what it does
    → Ask if the user needs it
    → If yes, collect sub-parameters
          │
          ▼
[Agent auto-wires implicit capabilities]
  → Role assignments
  → Private endpoints
  → Managed identity
  → Write-only secrets
```
