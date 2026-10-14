---
id: UC-01
status: draft
priority: Must
parent_dr: registration-evidence.md
---

# UC-01: Register for an event

**Linked JTBD**: JTBD-99 (legacy proposal, not approved by the PRD)

**Primary actor**: Community member (legacy alias, not the PRD name)

**Trigger**: The participant submits registration for an Event.

**Main flow**:

1. The participant selects an Event.
2. The system records a Registration and confirms it.

**Acceptance checks**:

- `AC-01`: Submitting registration creates one Registration and a confirmation.
- `AC-02`: Repeated registration yields `REGISTRATION_ALREADY_EXISTS` without
  another Registration.

## Open questions

The parent already owns retention under `open.item-001`.
