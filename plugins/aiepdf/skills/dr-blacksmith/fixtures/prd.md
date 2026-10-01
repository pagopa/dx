# Hypothetical day-zero PRD — CED onboarding, blueprint plus embryonic objectives

> Fictional scenario for the demo: nothing exists yet on CED except the Figma
> blueprint and an embryo of objectives and use cases. Everything missing is
> recorded as a gap or open question, never invented.

## Metadata

- Sponsor: TBD, to be confirmed with the Disability Department
- Owner: CED Product, to be appointed
- Status: draft
- Available sources: Figma blueprint "CED Ecosystem and flows" node 837-1591,
  objectives note on a page attached in `demo/demo.md` section 3.1
- Unavailable sources: no previous PRD, no frozen agreement template, no
  repository, no OpenAPI

## Need definition

From the blueprints and embryonic objectives it emerges that an entity wants to
join CED by uploading a signed agreement, without opening manual tickets. The
rest of the flow after the upload, including back office and notifications, is
visible in the blueprint but excluded from the pilot.

Gap: the exact boundary between upload and BO review must be confirmed in the DR.

## Target audience

- Partner Entity: the one who fills in and uploads the agreement; the exact role
  is to be confirmed with the blueprint, representative or delegate TBD.

## Embryonic objectives

### Business goals

- BG-01 proposed: successful upload with no manual tickets on the demo cases.
  Threshold TBD in the DR.

### Users goals

| Goal ID | Persona            | Job statement                                                                                              | Expected outcome                                     | Success metric | Quality guardrail                     | Priority | Notes                                       |
| ------- | ------------------ | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | -------------- | ------------------------------------- | -------- | ------------------------------------------- |
| JTBD-01 | Partner Entity TBD | When I need to join CED, I want to upload the signed agreement, so that I finish in review without support | The entity uploads and sees PENDING, to be confirmed | TBD in DR      | Only CAdES assumed, PII never in logs | Must     | From blueprint, file format to be confirmed |

## Strategic dependencies

- Team: CED Product TBD, Engineering TBD, CED BO TBD.
- Systems: none existing, greenfield bootstrap to be defined in the DR.
- Blueprint linked, no other system assumed.

## Initial risks and red flags

| ID    | Area      | Red flag                                                    | Impact | Owner              | Required action             |
| ----- | --------- | ----------------------------------------------------------- | ------ | ------------------ | --------------------------- |
| RF-01 | Product   | Agreement template not defined, only a box in the blueprint | High   | Product            | Define template in DR OQ-01 |
| RF-02 | Technical | Signature format only assumed CAdES from the blueprint      | High   | Product with Legal | Confirm format in DR        |
| RF-03 | Technical | No repository and no contract, everything to be created     | Medium | Engineering        | Propose bootstrap in DR     |

## How we measure success, proposed

- Valid upload of demo fixtures leads to PENDING.
- Invalid upload leads to a typed error without a state change.
- Thresholds and final fixtures TBD in DR and UC.

## Context and constraints, assumed to be confirmed

- Agreement data treated as confidential, classification TBD.
- Signature verification assumed to cover format and validity only, identity TBD.
- States `REQUEST` and `PENDING` as proposed names from the blueprint, to be
  confirmed.

## Experience

Only the Figma blueprint node 837-1591, entity upload step. No detailed Figma,
no journey map beyond the board.

## Open points

| ID    | Question                                              | Blocking | Owner                    | Outcome |
| ----- | ----------------------------------------------------- | -------- | ------------------------ | ------- |
| OQ-01 | Which agreement template and which version?           | Yes      | Product with BO          | TBD     |
| OQ-02 | Allowed signature format, only CAdES or others too?   | Yes      | Product with Legal       | TBD     |
| OQ-03 | Who is the exact actor, representative or delegate?   | No       | Product                  | TBD     |
| OQ-04 | Is entity authentication needed already in the pilot? | Yes      | Product with Engineering | TBD     |

## Support and support readiness

- To be assessed, no runbook exists.
- User errors expected only from the blueprint: file format and signature;
  detail in `uc.md` as a proposal.
