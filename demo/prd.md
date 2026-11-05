# Hypothetical day-zero PRD — CED Adhesion, blueprint + embryonic goals only

> Fictional demo scenario: nothing exists for CED yet, except the embryo of goals and use cases.
> Everything missing is recorded as a gap or open question, not made up.

## Metadata

- Sponsor: Disability Department
- Owner: Product IO
- Status: draft
- Unavailable sources: no previous PRD, no frozen agreement template, no repo,
  no OpenAPI, no detailed Figma blueprint

## Problem statement

From the blueprints and embryonic goals it emerges that an entity wants to join
CED by uploading a signed agreement, without opening manual tickets. The rest of
the flow after upload, including backoffice and notifications, is visible in the
blueprint but excluded from the pilot.

Gap: the exact boundary between upload and BO review is to be confirmed in DR.

## Target audience

- Partner Entity: whoever fills out and uploads the agreement, exact role to be
  confirmed with the blueprint, representative or delegate TBD.

## Goals

### Business goals

- BG-01 proposal: successful upload without manual tickets on demo cases.

### User goals

| Goal ID | Persona            | Job statement                                                                                                     | Expected outcome                                | Success metric                               | Quality guardrail                          | Priority | Notes                                       |
| ------- | ------------------ | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | -------------------------------------------- | ------------------------------------------ | -------- | ------------------------------------------- |
| JTBD-01 | Partner Entity TBD | When I need to join CED, I want to upload the signed agreement so that I end up in review without needing support | Entity uploads and sees PENDING to be confirmed | > 80% demo uploads completed without tickets | CAdES only hypothesized, PII never in logs | Must     | From blueprint, file format to be confirmed |

## Strategic dependencies

- Team: Product IO App, Engineering IO App.
- Systems: none existing, greenfield bootstrap in DR.

## Risks and initial red flags

| ID    | Area      | Red flag                                                    | Impact | Owner              | Required action             |
| ----- | --------- | ----------------------------------------------------------- | ------ | ------------------ | --------------------------- |
| RF-01 | Product   | Agreement template not defined, only a box in the blueprint | High   | Product            | Define template in DR OQ-01 |
| RF-02 | Technical | Signature format only hypothesized CAdES from blueprint     | High   | Product with Legal | Confirm format in DR        |
| RF-03 | Technical | No repo or contract, everything to be created               | Medium | Engineering        | Propose bootstrap in DR     |

## How we measure success, proposal

- Valid demo fixture upload leads to PENDING.
- Invalid upload leads to typed error without state change.

## Context and hypothesized constraints to confirm

- Agreement data treated as confidential, classification TBD.
- Signature verification hypothesized as format and validity only, identity TBD.
- `REQUEST` and `PENDING` status names proposed from blueprint, to be confirmed.

## Experience

No detailed Figma, no journey map beyond the board.

## Open points

| ID    | Question                                                | Blocker | Owner                    | Outcome |
| ----- | ------------------------------------------------------- | ------- | ------------------------ | ------- |
| OQ-01 | Which agreement template and version?                   | Yes     | Product with BO          | TBD     |
| OQ-02 | Allowed signature format, CAdES only or others?         | Yes     | Product with Legal       | TBD     |
| OQ-03 | Who is the exact actor, representative or delegate?     | No      | Product                  | TBD     |
| OQ-04 | Is entity authentication required already in the pilot? | Yes     | Product with Engineering | TBD     |

## Support readiness

- To be evaluated, no existing runbook.
