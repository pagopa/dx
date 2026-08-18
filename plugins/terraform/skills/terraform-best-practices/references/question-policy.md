# Decision Policy

Use this policy to resolve Terraform inputs without guessing project values or transferring convention-owned decisions to the user.

## Classify Before Asking

Classify every unresolved input:

| Class | Evidence | Action |
| --- | --- | --- |
| DX convention | DX documentation or an applicable guardrail determines the value or pattern. | Apply it and disclose it in the pre-edit summary. |
| Repository fact | The same environment, service, or explicitly requested reference instance provides the value. | Reuse it and cite the file or module instance used as evidence. |
| Material decision | The choice changes security, cost, exposure, scale, resilience, retention, durability, or operations. | Present source-derived options and require an explicit user choice. |
| Low-impact optional input | The module defines a safe default and the capability is not relevant to the request. | Omit the input intentionally and do not ask about it. |

Do not infer a material decision from an environment name, generic best practice, or the module default alone.

## Material Decisions

Treat these as material unless the user already made the choice explicitly:

- module `use_case`
- public or private exposure
- SKU, sizing, throughput, and autoscaling bounds
- redundancy, replicas, zones, and geo-replication
- retention, backup, and data durability
- authentication and authorization modes
- creation or use of secret material
- adoption of a new service or Technology Radar item
- destructive migration behavior
- code structure when two layouts are equally consistent with the repository

Only ask about capabilities relevant to the requested outcome or a material module default. Do not enumerate every optional variable.

## Decision Card

Ask about one trade-off at a time. A decision may include several fields that must be considered together; do not split it into one prompt per scalar.

Before asking:

1. Derive valid options from module variables, validation blocks, locals, implementation, and examples.
2. State the behavior when the input is omitted.
3. Explain relevant security, cost, scale, resilience, and operational effects.
4. Recommend an option when evidence supports one, but do not preselect it.

Use this shape:

| Option | Behavior | Material effects |
| --- | --- | --- |
| `<source-derived value>` | What the module creates or configures. | Security, cost, resilience, or operational consequences. |

Then ask for the decision explicitly.

## `use_case` Policy

Never invent or silently select a `use_case`.

Ask the user unless:

- the user supplied the exact value; or
- the user explicitly asked to mirror a named existing module instance.

Do not select a `use_case` from `env_short`, folder name, or production heuristics alone. Present every valid source-derived option, identify the module default, explain production suitability, and allow the user to choose.

## Factual Inputs

Infer factual inputs before asking:

- `prefix`
- `env_short`
- `location`
- `domain`
- `app_name`
- `instance_number`
- subscription references
- resource group references
- required tags
- shared core-values-exporter outputs
- backend configuration already present in the target area

When several independent factual inputs remain missing, collect them in one structured prompt. Offer choices only when the valid set is known; otherwise use free text.

Preserve the repository's standard `environment` object instead of replacing it with unrelated module-specific naming inputs.

Never invent ownership, cost allocation, naming, backend, or subscription values.

## Required Follow-ups

After a capability is selected, ask only for sub-fields required by that selection. Stop asking once the requested outcome can be implemented completely and safely.
