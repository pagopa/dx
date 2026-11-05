---
id: UC-19
status: draft
priority: Should
parent_dr: ../design-review.md
---

# `UC-19`: Explore engineering and adoption metrics

**Linked JTBD**: N/A — no applicable PRD; direct DR intake.

**Primary actor**: Authorized metrics reader.

**Secondary actors**: Data importer, data-owning team and repository-owning teams.

**Source artifact**: [Metrics portal](../../apps/dx-metrics/README.md), [metrics importer](../../apps/dx-metrics-import/README.md), [metrics glossary](../../apps/dx-metrics/GLOSSARY.md) and [metrics scope decision](../../apps/dx-metrics/docs/adr/0001-repository-scopes.md).

**Service Blueprint step**: [SB-06 Observe and operate](../service-blueprint.md#sb-06-observe-and-operate).

**Domain entities**: Team, Workspace, Dataset, Engineering observation and scope.

**Trigger**: A reader wants to understand engineering activity or adoption for an authorized repository scope.

**Preconditions**:

- Repository data has been configured for import and the reader has a valid scope.
- The relevant data source and persistence layer are available.
- The agreed baseline requires data minimization, restricted access and protection of confidential data; security and privacy assessments precede production. Existing assessment and enforcement evidence remains open in parent `open.item-003`.
- The data-owning team defines classification and retention under applicable policies; actual assignments and periods remain open in parent `open.item-003`.
- Global data without a repository dimension is visible to full scopes by default; limited scopes require explicit data-owner classification as shareable and a privacy assessment where applicable.

**Main flow**:

1. The importer retrieves the configured engineering observations and stores them for analysis.
2. The reader opens the metrics view with an authorized scope.
3. The reader selects an available reporting period.
4. The view presents the relevant engineering and adoption measures for repositories in that scope.
5. The reader can distinguish the available data range and its most recent imported observation from the current date.

**Alternate flows**:

- `A1`: A repository-specific import updates the selected repository without importing unrelated organization-wide datasets.
- `A2`: Adoption snapshots describe the current imported state and are not represented as historical time-windowed observations.
- `A3`: When the required sources and definitions are available, the team can review the agreed aggregate product outcome indicators quarterly. Availability of every indicator is not yet established.
- `A4`: A limited scope can access a global dataset only when the data owner has classified it as shareable and privacy has assessed it where applicable.

**Exception flows / edge cases**:

- `E1`: A reader does not have a valid scope -> Error: `SCOPE_REQUIRED`.
- `E2`: An import cannot complete its window -> Error: `IMPORT_INCOMPLETE`.
- `E3`: A limited scope requests global data not approved for that scope -> Error: `GLOBAL_DATA_SCOPE_FORBIDDEN`.

**Postconditions**:

- Repository-scoped views expose only the configured repositories granted by the reader's scope; data must not leak between scopes through shared caches.
- A scope does not itself grant permissions in the source system. The current implementation uses a shared credential rather than personal identity; alternative access mechanisms are allowed.
- The current shared credential cannot be revoked per link; rotating it invalidates all links. The current configured portfolio contains only public repositories. These are implementation-specific limitations, not requirements to reproduce the same mechanism.
- Some existing views show global data to any valid scope. Their data-owner classification, privacy assessment and conformance with the agreed policy remain unverified.
- A failed import window does not advance its completion cursor.
- A later scheduled execution may resume an eligible incomplete window when safe; retries within each execution are bounded and persistent failures remain explicit. The current importer's per-execution limits and retry safety remain to be verified in parent `open.item-007`.

**Errors**:

- `SCOPE_REQUIRED`: No valid scope is available -> the portal does not serve metrics data.
- `IMPORT_INCOMPLETE`: The importer cannot fetch the full relevant window -> it reports failure and leaves that window's cursor unchanged for a later retry.
- `GLOBAL_DATA_SCOPE_FORBIDDEN`: A limited scope requests global data without the required shareable classification and applicable privacy assessment -> omit or deny the data in both human and automated interfaces.

**Acceptance checks**:

- `AC-01`: Without a valid scope, the portal does not serve metrics data and directs the reader to the access flow, classified as `SCOPE_REQUIRED`. Evidence: [metrics portal](../../apps/dx-metrics/README.md).
- `AC-02`: A reader with a limited scope sees only repositories included in that scope and not excluded repositories; a full scope may include the whole imported portfolio. Evidence: [metrics glossary](../../apps/dx-metrics/GLOSSARY.md).
- `AC-03`: If an import cannot fetch its full window, it reports `IMPORT_INCOMPLETE` and does not advance that window's cursor. Evidence: [metrics importer](../../apps/dx-metrics-import/README.md).
- `AC-04`: A time-windowed view is bounded by the available imported data, and a snapshot is not presented as time-windowed history. Evidence: [metrics portal](../../apps/dx-metrics/README.md), [metrics glossary](../../apps/dx-metrics/GLOSSARY.md).
- `AC-05`: After `IMPORT_INCOMPLETE`, a later scheduled execution may safely resume an eligible incomplete window without advancing its cursor prematurely; retries within an execution are bounded. Evidence: [metrics importer](../../apps/dx-metrics-import/README.md), [agreed retry policy](../design-review.md#solution-design); implementation safety and limits remain unverified in parent `open.item-007`.
- `AC-06`: A reader in one repository scope cannot receive another scope's repository data through a shared cache. Evidence: [metrics scope decision](../../apps/dx-metrics/docs/adr/0001-repository-scopes.md), [cache isolation](../../apps/dx-metrics/src/lib/api-cache.ts).
- `AC-07`: A limited scope cannot receive or display global data without explicit shareable classification and any applicable privacy assessment; a direct request is denied or omitted as `GLOBAL_DATA_SCOPE_FORBIDDEN`. Evidence: stakeholder decision in `uc-open-01`; implementation verification remains in parent `open.item-003`.
- `AC-08`: A limited scope may receive global data when the data owner has explicitly classified it as shareable and privacy has assessed it where applicable. Evidence: stakeholder decision in `uc-open-01`; classification and implementation verification remain in parent `open.item-003`.

**Tracking events**: Product analytics are aggregated by default; individual data is used only when necessary and assessed by privacy. The event inventory is not established; see parent `open.item-003`.

**Relevant links**:

- Sequence diagram:

  ```mermaid
  sequenceDiagram
      participant Source as Engineering data source
      participant Importer
      participant Store as Metrics persistence
      actor Reader as Scoped reader
      Importer->>Source: Fetch configured observations
      Importer->>Store: Persist observations and completed cursor
      Reader->>Store: Request scoped period
      Store-->>Reader: Authorized metrics and data range
  ```

- Service Blueprint: [SB-06 Observe and operate](../service-blueprint.md#sb-06-observe-and-operate).
- Design discovery: N/A — no other applicable design-discovery source, confirmed in the parent.
- DR components: `solution.components.item-008`, `solution.components.item-012`.
- Interface / data contract: `contracts.item-009`.
- Cross-cutting NFR: `NFR-02` applies to a continuously accessible metrics service; `NFR-06` applies if its data is classified as critical and non-reconstructible; `NFR-08` applies to human-facing web content. Classification, measurement and accessibility evidence remain open in parent `open.item-004` and `open.item-006`.
- Validation evidence: [metrics portal](../../apps/dx-metrics/README.md), [importer](../../apps/dx-metrics-import/README.md).

## Open questions and propagation

| ID | Type | Item | Impact / blocker | Owner | Resolution / link |
| --- | --- | --- | --- | --- | --- |
| `uc-open-01` | Decision | Global data without a repository dimension is visible to full scopes by default; limited scopes may access it only when the data owner explicitly classifies it as shareable and privacy has assessed it where applicable. Otherwise it is not shown or returned. | Some current views expose shared data to any valid scope; dataset classification and compliance with the agreed policy remain unverified. | DX Product Owner | Confirmed by the requesting stakeholder 2026-11-04; [metrics scope decision](../../apps/dx-metrics/docs/adr/0001-repository-scopes.md), [current shared-data view](../../apps/dx-metrics/src/app/api/dashboards/tracker/route.ts); parent `open.item-003`. |
