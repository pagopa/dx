# FINDINGS — OPA as the source of truth for a GenAI-driven IaC workflow

> **The real question this PoC tries to answer.**
> Today our internal infrastructure code is grounded by **custom dx Terraform
> modules** and a **custom `dx` provider**. Both are valuable for humans but
> are a hostile context for an LLM.
>
> Instead of teaching an AI agent our modules, can we **publish OPA policies
> as the contract**, let the AI author plain `azurerm_*` Terraform in any
> consumer repo, and use those policies (e.g. run from a DX skill)
> to verify that the generated code respects our rules?
>
> **TL;DR.** Yes, it is feasible and the value proposition is real:
> policies are a lingua franca every LLM already understands (they are just
> rules over JSON), and validation is exactly what OPA is built for. The
> main caveats are two, both visible in this PoC:
>
> 1. **Module configuration matrices (e.g. `use_case`) must be re-expressed
>    as policy parameters.** This PoC shows it works
>    ([`policies/use_case.rego`](policies/use_case.rego)), at the cost of a
>    convention: the AI must surface its intent (e.g. as a `DXUseCase` tag)
>    so the policy can pick the right ruleset.
> 2. **Composition guarantees the modules give "for free" (storage + PEP +
>    diagnostic + role assignments …) become the AI's responsibility.** OPA
>    can _verify_ they are all present in the plan, it cannot _emit_ them.
>    Net effect: the AI writes much more HCL than a human module-consumer
>    would, and the policy bundle becomes the spec that tells the AI what
>    to emit.

---

## Method

This PoC takes two real DX assets:

- the [`azure_storage_account`](../infra/modules/azure_storage_account/) and
  [`azure_function_app`](../infra/modules/azure_function_app/) Terraform
  modules,
- the [`provider::dx::resource_name`](../providers/azure/internal/provider/function_resource_name.go)
  function in the custom Go provider,

and tries to express their guarantees as OPA Rego policies that run against
`terraform show -json` output. Threewo Terraform projects (one
compliant, one deliberately broken and one as reference that use DX modules — all in
[`terraform/`](terraform/)) demonstrate the policies in action using real
`terraform plan` output.

Concrete numbers for the subset chosen:

| Asset                                  | Lines (TF/Go)                                                                                             | Lines (Rego, this PoC)                                                | Coverage                                                                                                         |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `azure_storage_account` module         | ~180 (`storage_account.tf`) + ~60 (`locals.tf`) + ~200 (networking, alerts, cmk, monitoring, replication) | 92 (`policies/storage_account.rego`) + 120 (`policies/use_case.rego`) | 8 generic invariants + the full `use_case` matrix (5 use cases × 4 settings + 1 audit-only cross-resource check) |
| `azure_function_app` module            | ~120 (`function_app.tf`) + supporting files for ~600 lines total                                          | 100 (`policies/function_app.rego`)                                    | 9 invariants out of ~20                                                                                          |
| `provider::dx::resource_name` function | ~480 lines of Go                                                                                          | 105 (`policies/lib/naming.rego`)                                      | Format + abbreviation map + env/location validation; redundancy checks **not** ported                            |
| Cross-resource composition guarantees  | implicit — emerges from module side-effects                                                               | 80 (`policies/cross_resource.rego`)                                   | 3 invariants (storage↔PEP, func↔storage, func↔diag)                                                              |

47 unit tests exercise the policies directly, and the real broken plan is
used as the executable end-to-end negative case.

---

## What OPA can do

### ✅ Hard property checks

Every must-have / forbidden value the modules pin is trivially expressible
in Rego: TLS minimum, public network off, MSI auth, identity blocks present,
`always_on`, `ip_restriction_default_action = "Deny"`, etc. These are
exactly the rules in
[`storage_account.rego`](policies/storage_account.rego) and
[`function_app.rego`](policies/function_app.rego). They run in
milliseconds, fail fast in CI, and produce a tagged error message per
violation so the user knows what to fix.

### ✅ Naming convention

The format produced by `provider::dx::resource_name` is fully reproducible
in Rego — see [`policies/lib/naming.rego`](policies/lib/naming.rego). The
PoC even computes the same name (`dx-d-itn-platform-poc-func-01`,
`dxditnplatformpocstfn01`) for the same configuration map. Two checks are
exposed:

- `naming.expected_name(config)`: full equality check, identical to the Go
  function's output,
- `naming.shape_ok(resource_type, name)`: a regex sanity check used when
  the policy doesn't have access to `{prefix, env, location, domain}`
  separately (which is the realistic case at policy time — see "Limit 3"
  below).

### ✅ Cross-resource invariants

Things that come "for free" with the module — every private storage account
has a PEP, every function app's storage is also defined in the same plan — can
be expressed as
[plan-wide Rego rules](policies/cross_resource.rego). They iterate over
`input.resource_changes` and assert relationships.

### ✅ Decoupling from Terraform

The same Rego rules apply to a Pulumi state, a Crossplane composition, an
ARM template, or a hand-edited JSON. The modules cannot say the same.

---

## What OPA cannot do (and why "modules + provider → OPA" doesn't fully work)

### ❌ Limit 1 — composition / code generation

The modules don't just enforce invariants: they **create resources**. A
single `module "func" { … }` call expands into:

- 1× `azurerm_linux_function_app`
- 1× `azurerm_service_plan` (or accepts an existing one)
- 1× `azurerm_storage_account` (the function backing storage)
- 1× `azurerm_storage_account` for durable functions, conditionally
- 4× `azurerm_private_endpoint` (blob/file/queue/table) + 4× DNS A records
- 1× `azurerm_subnet` (if not provided)
- N× `azurerm_role_assignment` (Storage Blob Data Owner for the MSI)
- N× alerts (`azurerm_monitor_metric_alert` …)
- Computed `app_settings`: `WEBSITE_RUN_FROM_PACKAGE`, AI sampling,
  durable hub name, `WEBSITE_SWAP_WARMUP_PING_PATH`, …

OPA can _check_ that all these resources are present. It cannot _produce_
them. Replacing the module forces every consumer to copy a few hundred lines of
HCL they previously got from one `module` block. The PoC's
[`terraform/compliant/main.tf`](terraform/compliant/main.tf) — a
deliberately explicit raw version — is now a few hundred lines long.

> **This is the real gap.** Modules are a code-generation tool;
> OPA is a validation tool. They are not in the same product category.

### ❌ Limit 2 — defaulting and conditional logic

The module picks `replication_type = "ZRS"` for `default`, `LRS` for
`development`, sets `infrastructure_encryption_enabled = true` for
`audit`, derives `force_public_network_access_enabled` from the use case,
chooses `account_tier` automatically, etc. OPA can _check_ that the chosen
value matches a policy expectation, but it cannot _provide_ a default
when the user omits the field. A consumer using raw resources must
re-implement the `use_cases` matrix in HCL `locals`.

### ❌ Limit 3 — name **construction** vs. name **validation**

`provider::dx::resource_name(...)` is a function that **produces** a name
from a configuration map. OPA can validate a name against the same
configuration, but only if **the configuration is in the input** — and
it isn't. `terraform show -json` exposes the resulting `name` string, not
the `{prefix, env, location, domain}` triple the user used to compute it.

This means:

- Without a side-channel, OPA can only do the **shape** check
  (`naming.shape_ok`): the regex `^[a-z0-9]{2,4}-[dup]-(weu|itn)…` matches,
  but a typo like `dx-d-itn-payments-func-99` for a project that should be
  `payments-platform` will silently pass.
- To do the **strict** check (`naming.valid_name`), the project must surface
  the configuration as an input variable / output / tag that the policy can
  read. The PoC suggests embedding it as a tag (e.g. `DXNamingConfig =
jsonencode({...})`) — feasible, but it is exactly the kind of boilerplate
  the custom provider exists to remove.

In practice, the custom provider gives stronger guarantees than the policy
can: errors surface at `terraform validate` time, not after `terraform
plan`, and the user never has to type the result.

### ❌ Limit 4 — RBAC, role assignments and MSI plumbing

The function app module creates `azurerm_role_assignment` resources to
grant the function's MSI access to its storage (`Storage Blob Data Owner`
etc.). Without the module, these must be authored by hand for every
function. OPA can detect their absence (and the PoC could be extended to
do so), but it cannot write them.

### ❌ Limit 5 — module-injected tags and lineage

`local.tags` in every module merges in `ModuleSource`, `ModuleVersion`,
`ModuleName` from the module's own `package.json`. DX uses these for
adoption metrics and drift detection. Without the module, the consumer
must remember to set the tag — and the OPA rule
`[storage:tag_module_source]` is a poor substitute: it only checks the
**presence** of the tag, not its **truthfulness** (anyone can write
`ModuleSource = "azure_storage_account"` without using the module).

### ❌ Limit 6 — `lifecycle` blocks and `depends_on`

`ignore_changes` and explicit `depends_on` are not first-class concepts in
the plan JSON exposed to OPA. They are part of the configuration, not the
plan. Policies that try to enforce "you must `ignore_changes` on
`customer_managed_key`" cannot be written against `terraform show -json`
alone.

### ❌ Limit 7 — late-bound values ("known after apply")

Many cross-resource references resolve to `(known after apply)` in the
plan — for instance, a private endpoint's `private_connection_resource_id`
is a `KnownAfterApply` token. The `[xref:storage_pep]` rule in this PoC
falls back to a **substring match** on the resource name, which is fragile
and can produce false positives. The dx module avoids the problem entirely
by referencing the resource directly in HCL.

### ❌ Limit 8 — drift detection on existing infrastructure

The modules version themselves and consumers bump them. OPA policies are
versioned in their own repo. If a consumer pins module v3.2 and never
bumps, they keep v3.2 behaviour. If a consumer's CI loads policy v5,
their _existing_ storage accounts (already created with TLS 1.0) will
suddenly be in violation, producing a flood of failures with no automated
migration path. With the module, a `terraform apply` after a version bump
remediates the drift; with a policy bump, the consumer must remediate by
hand.

### ❌ Limit 9 — Redundancy in resources instead of modules

The modules reduce the amount of HCL in a single terraform project,
if AI generates raw resources instead of module calls, is possible
that the same resource (e.g. a storage account) is defined in multiple
places (e.g. function app + durable functions). The module guarantees
they are the same resource; with raw HCL, the OPA policy can only
check they have the same name, which is a weaker guarantee.

---

## Verdict by use case

| Goal                                                              | Module + provider (for humans) | Policies + AI agent              |
| ----------------------------------------------------------------- | ------------------------------ | -------------------------------- |
| Stop a misconfiguration before someone writes it                  | ✅                             | ⚠️ AI retries until clean        |
| Catch a misconfiguration after the fact (CI gate)                 | ✅                             | ✅                               |
| Add a new constraint everywhere atomically                        | module bump + consumer PR      | edit one policy file             |
| Compose 10+ related resources from one call                       | ✅                             | ⚠️ AI must emit them all         |
| Authoring-time autocomplete (Terraform LSP)                       | ✅                             | ⚠️ plain `azurerm` LSP only      |
| Express the constraint in a tool-agnostic way (Pulumi, ARM, …)    | ❌                             | ✅                               |
| Distribute rules to repos outside DX                              | ❌                             | ✅ (OCI bundle, MCP, …)          |
| Cheap to maintain (one place defines TLS = 1.2 for the whole org) | ✅                             | ✅                               |
| Cheap to **author** a single new function app by a human          | ✅                             | ❌ (verbose plain HCL)           |
| Cheap to **author** a single new function app by an AI agent      | ❌ (LLM doesn't know our API)  | ✅                               |
| Switch defaults via a single variable (`use_case`)                | ✅                             | ✅ via `DXUseCase` tag (see PoC) |

---

## Recommended posture

The modules, the custom provider and the OPA policies are **not
alternatives, they are complements** with different audiences:

1. **Humans authoring DX-internal Terraform** keep using the modules and
   the `dx` provider. They are a code-generation tool and there is no
   cheap substitute for the composition they provide.
2. **AI agents authoring Terraform in consumer repos** consume the OPA
   policy bundle instead. The bundle becomes the contract: policies
   encode the matrix (`use_case`), the naming, the cross-resource
   invariants. The AI emits plain `azurerm_*`, validates locally with
   `conftest`, iterates until clean, then opens a PR.
3. **CI in every consumer repo** runs the same OPA policies as a final
   gate, regardless of whether the code was written by a human, by an AI,
   or copy-pasted from a vendor.

The cost of dual maintenance is real but bounded: each policy in this PoC
mirrors **one** line of the corresponding module. When the module changes
the rule (e.g. raising the minimum TLS to 1.3), the policy changes the same
line. The two stay in sync if the team treats them as **one feature with
two surfaces**. To make this practical, ship the policies as a versioned
bundle (OCI image or GitHub release) and bake the version number into the
CI workflow consumers reference; that way an AI run in a downstream repo
deterministically uses the policy revision the DX team currently endorses.

---

## The GenAI workflow this PoC enables

The intended consumer of these policies is **not** a human writing
Terraform — it is an LLM agent (e.g. a Copilot skill backed by the
`mcpserver` in [`apps/mcpserver/`](../apps/mcpserver/)) authoring
infrastructure in a downstream repo.

```
┌────────────────────┐        ┌──────────────────────────┐
│  Consumer repo     │        │  DX repo                 │
│  (any team)        │        │                          │
│                    │        │  policies/  (this PoC)   │
│  main.tf  ◀────── prompt ── │  skill that runs:        │
│  (plain azurerm)   │  +     │    terraform plan        │
│                    │  rules │    terraform show -json  │
│  tfplan ────────── send ──▶ │    conftest test         │
│                    │        │                          │
│  ◀──── deny tags + remediation ───────────────────────┐│
└────────────────────┘        └──────────────────────────┘
```

### Why this beats "teach the AI our modules"

| Concern                                             | Custom modules in the AI's context                          | OPA policies as the AI's context                                  |
| --------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------- |
| The AI must know the API of `module "func" { … }`   | requires consuming `variables.tf` + `outputs.tf` + `README` | not needed: the AI emits raw `azurerm_*`                          |
| The AI must reason about defaults vs. overrides     | hidden in `locals.tf` matrices                              | explicit in policy data tables (see use_case)                     |
| The AI must respect naming                          | "call this Go function I have never seen"                   | a regex it can satisfy + a tag it must set                        |
| Bug reports from the AI                             | "the module exploded with `unknown attribute X`"            | "rule `[func:storage_msi]` denied my plan because Y" — actionable |
| Adding a new constraint                             | requires a module version bump + consumer upgrade           | edit policy, AI picks it up on next run                           |
| Out-of-band consumers (legacy code, hand-edited TF) | bypass the module entirely                                  | still gated by the same policies in CI                            |
| Cross-IaC (Pulumi, Bicep, ARM)                      | impossible — modules are Terraform-only                     | the same Rego applies to any JSON plan                            |
| LLM training/grounding cost                         | a private API per module, never seen by public models       | rules are short, declarative, model-friendly                      |

The deal is: **policies become the spec**, the AI writes plain HCL, and the
DX repo is no longer the centre of gravity for every consumer.

### How a skill would use this

The AI's loop becomes: emit HCL → plan → validate → on `deny`, patch →
re-validate. This is the same pattern the
[`opa-poc/`](../opa-poc/) story 06 sibling demonstrates for runtime LLM
gateway authorization, applied to authoring.

### Where the workflow is codified as Copilot skills

Two companion Agent Skills make this loop concrete and discoverable:

- **DX side — policy authoring:**
  [`.github/skills/extract-policies-from-module/`](../.github/skills/extract-policies-from-module/SKILL.md)
  encodes the workflow that produced this PoC, so the next module added to
  the bundle costs less. Audience: DX maintainers. Triggered when a module
  is added or its defaults change.
- **Consumer side — infra authoring with the bundle:**
  [`plugins/terraform/skills/generate-azure-infra-with-dx-policies/`](../plugins/terraform/skills/generate-azure-infra-with-dx-policies/SKILL.md)
  is shipped through the `plugins/terraform/` plugin — i.e. it lands in the
  consumer repos that install the DX Copilot plugin pack. It runs the
  emit-plan-conftest-patch loop against the published policy bundle.
  Audience: AI agents (and humans) authoring `azurerm_*` Terraform outside
  `pagopa/dx`.

### Feasibility: green, with two non-trivial caveats

- ✅ **The PoC already runs the whole loop offline** — `make demo` proves
  conftest produces a structured `FAIL` per violated invariant, which is
  exactly what an LLM needs to self-correct. No model-specific glue.
- ✅ **The OPA bundle is portable** — it can ship as an OCI image, a
  GitHub release artifact, or be fetched by the MCP server. Consumers
  don't depend on a Terraform module they may not have access to.
- ⚠️ **Module configuration matrices need explicit re-expression** in the
  policy bundle. The next section uses `use_case` as the worst-case
  example. The PoC ports it; it is not free, but it is doable in ~60
  Rego lines per matrix.
- ⚠️ **Composition is on the AI now.** The agent must remember to emit
  the storage + PEPs + slot + role assignments for every
  function app. The policies catch omissions; they don't fix them. This
  is mitigated by adding a `policy_index.md` (or equivalent prompt
  fragment) listing the resources expected to appear together. We
  recommend authoring this file alongside the policies, so the AI sees
  both the rules and the expected resource list before generating code.

---

## Case study: replacing the module's `use_case` variable

Almost every DX module exposes a `use_case` variable that switches an
entire family of defaults at once. In
[`azure_storage_account`](../infra/modules/azure_storage_account/) the
five values are wired to a 5×9 matrix in `local.use_cases`:

| use_case           | replication_type | infra_encryption | default_to_oauth | shared_access_key | … (immutability, alerts, …) |
| ------------------ | ---------------- | ---------------: | ---------------: | ----------------: | --------------------------- |
| `development`      | `LRS`            |            false |            false |              true | minimal                     |
| `default`          | `ZRS`            |            false |            false |              true | standard                    |
| `audit`            | `ZRS`            |         **true** |         **true** |              true | immutability + lifecycle    |
| `delegated_access` | `ZRS`            |            false |            false |         **false** | advanced threat protection  |
| `archive`          | `LRS`            |            false |            false |              true | immutability + archive tier |

Some entries are not even "defaults" — they trigger **additional resources**
(an `azurerm_storage_management_policy` for `audit` and `archive`, a
`azurerm_security_center_storage_defender` for `delegated_access`).

### How the PoC ports it

The full matrix is encoded in
[`policies/use_case.rego`](policies/use_case.rego) as a Rego data table.
Because the use_case label is **not** in `terraform show -json` (it is a
module variable, evaluated away by the time we get the JSON), the AI must
publish its intent as a tag on the resource:

```hcl
resource "azurerm_storage_account" "this" {
  # … fields chosen to match DXUseCase=audit …
  tags = {
    DXUseCase    = "audit"
    ModuleSource = "raw"
  }
}
```

The policy then:

1. matches every storage account that carries a `DXUseCase` tag,
2. validates the tag value is one of the recognised use cases
   (`[uc:unknown]`),
3. for each of the four settings in the matrix (replication, infra
   encryption, OAuth-by-default, shared-key gate), emits a deny if the
   resource's value doesn't match
   (`[uc:replication]`, `[uc:infra_encryption]`, `[uc:oauth]`, `[uc:shared_key]`),
4. for `use_case='audit'`, additionally requires an
   `azurerm_storage_management_policy` in the same plan whose
   `storage_account_id` references this account (`[uc:audit_lifecycle]`).

7 dedicated tests under
[`policies/use_case_test.rego`](policies/use_case_test.rego) cover every
branch. The tag is the only convention the AI has to honour; from there
the policies do the rest.

### Why this works in the AI flow

- The tag is **plain English**: an LLM that sees `# audit storage` in a
  user prompt has zero trouble emitting `DXUseCase = "audit"`.
- The deny messages are **action-keyed** (`[uc:oauth]` → flip one bool),
  which is exactly the granularity an LLM can patch automatically in a
  remediation loop.
- The matrix lives in **one Rego file**, in the DX repo. Updating "audit
  now also requires X" is a one-line change that every consumer's next
  AI run picks up — no module bump, no migration PR.
- The same approach generalises to other variables that gate sets of
  defaults: `sku`, `tier`, `environment`-derived settings, etc. Each one
  becomes a small matrix + a small policy package.

### Limits that remain

- The matrix encodes the **must-have** values, not the **defaulting**
  behaviour. If the AI omits the field altogether, the policy can only
  fail with a "missing field" message; it cannot patch the plan.
  Mitigation: list these as required fields in the policy index the AI
  reads up-front.
- For settings that are not present in the plan JSON at all (e.g.
  the module's `var.advanced_threat_protection` only triggers a
  `azurerm_security_center_storage_defender` resource, never a property
  on the storage account), the policy must fall back to **cross-resource
  presence checks**, as done in `[uc:audit_lifecycle]`. This works but
  produces less specific error messages.
- The convention (`DXUseCase` tag) is contractual. If the AI forgets to
  set it, the generic rules in
  [`storage_account.rego`](policies/storage_account.rego) still apply,
  but the use-case-specific tightening (e.g. `delegated_access` ⇒ no
  shared keys) does not. This is acceptable as a default-deny posture
  if the policy bundle also includes a rule
  `[uc:tag_required] every azurerm_storage_account must carry a
DXUseCase tag` — easy to add as a follow-up.

---

To keep the PoC focused, the following were left out. They are not
fundamental limitations, just extra work:

- Customer-managed keys (`cmk.tf`)
- Alerts (`alerts.tf`) — would map straightforwardly to OPA rules
- Replication topology (`replication.tf`)
- Static-website / custom-domain branches of the storage module
- Audit / archive lifecycle policies
- The full abbreviation map from the Go provider (~80 entries) — only the
  subset used in this PoC is ported
- The Go provider's redundancy checks (`validateRedundancy`) — the rule
  is one regex away in Rego, but the PoC keeps the lib small
