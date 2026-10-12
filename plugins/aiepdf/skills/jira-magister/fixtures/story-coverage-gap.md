# Synthetic item-level coverage audit

Offline preview; no Jira mutation is authorized. Only UC-01 is selected.
Source links below identify the supplied evidence, not fetched remote pages.

## Approved source UC-01

- Source URL: https://example.org/use-cases/UC-01.
- Status ready. Actor `Resident subscriber`.
- `AC-01`: Email subscription creates one Subscription and confirmation.
- `AC-02`: Unsupported delivery channel is rejected without a Subscription.
- Epic grouping is approved; both items belong to the subscription outcome.

## STORY-01

Projection Key: `UC-01::resident-subscription`.
Summary: As a Resident subscriber, I want to subscribe by email, so that I can
stay informed about service disruption.

### Source

UC-01 — https://example.org/use-cases/UC-01.

### Slice Scope ID

resident-subscription

### Output

A versioned subscription delivery slice with linked execution evidence.

### Checks

- The implementation artifact and execution report are addressable.

## TASK-01

Projection Key: `UC-01::subscription-delivery-evidence`.
Summary: Publish subscription delivery evidence.

### Source

UC-01 — https://example.org/use-cases/UC-01.

### Slice Scope ID

subscription-delivery-evidence

### Output

An addressable CI execution report linked to the delivery artifact.

### Checks

- CI discovers and executes tests tagged with the listed AC IDs.

### AC Coverage

- AC-01
- AC-02
