# UC-01 — Upload signed agreement (step 1)

- UC ID: UC-01
- Parent DR: design-review.md
- Linked JTBD: JTBD-01
- Priority: Must
- Status: draft

## Primary actor

Partner Entity (exact role TBD, see PRD OQ-03).

## Secondary actors

Documents archive, Practice registry.

## Source artifact

Figma blueprint "CED Ecosystem and flows" node 837-1591, entity upload step;
PRD.

## Service Blueprint step

Entity upload step. Back-office details are excluded from the pilot.

## Trigger

The entity selects the signed agreement file and submits the upload form.

## Preconditions

- A practice exists in the proposed state `REQUEST` with a known `onboardingId`.
- The agreement template and the allowed signature format are still TBD
  (PRD OQ-01, OQ-02).

## Main flow

1. The entity selects the file in the new portal upload form.
2. The front end sends a multipart request to the new back end with
   `onboardingId` and the file.
3. The back end verifies extension, format, and digest.
4. The back end creates the proposed Document record with `signingStep=1` and
   stores the blob.
5. The back end moves the practice from `REQUEST` to `PENDING`.
6. The back end responds with `documentId` and `status=PENDING`.
7. The front end shows the confirmation with state PENDING.

## Alternate and exception flows

- A1: if a valid step 1 already exists for the same `onboardingId`, respond
  `409` without overwriting.
- E1: wrong extension leads to a typed error, with no blob written.
- E2: invalid format or digest leads to a typed error, with no blob written.
- E3: practice not in `REQUEST` leads to a typed error, with no state change.
- E4: file over the demo limit leads to a typed error, with no state change.

## Postconditions

- On success: Document step 1 persisted, blob present, practice in `PENDING`.
- On failure: practice unchanged, no new blob, typed error without PII.

## Checks of acceptance

Gap: no binary acceptance check has been defined yet. Owner: Product, with QA
for testability. This gap must be resolved before the DR/SRS is considered ready
for backlog generation.

## Tracking events

Gap: tracking is not yet defined; to be assessed in review.

## Related resources

- Figma: board node 837-1591, upload step.
- API: not yet defined; to be created as a technical task.
