# Promoting unit tests into integration tests

Use when many unit tests already cover the feature and the user wants fewer live tests.

## Mindset

Do not translate every unit test. Collapse many cheap isolated cases into a few scenarios that prove real seams at the chosen boundary.

## Mine unit tests for

- request/event shapes worth preserving
- realistic seed data and IDs
- domain invariants that still matter with real dependencies
- error branches that map to meaningful integration scenarios
- caller/downstream-visible side effects

Leave behind mock counts, helper/mapper internals, fake clients, and tiny branches with little value once the real boundary runs.

## Classification guide

| Unit assertion | Integration move |
| --- | --- |
| client method called once | read back state or observe outbound stub request |
| handler returns 200 when use-case mock resolves | call real host/handler slice; assert response plus side effects |
| repository sends SQL/SDK input | use real dependency and read back rows/docs/blobs/messages |
| malformed payload rejection | keep one or two caller-visible boundary cases |
| pure domain enum/branch | usually stay unit-only |

## Common migrations

- Mocked Redis adapter -> Redis Testcontainer, disposable key namespace, read back value/TTL/stream/pub-sub.
- Handler with mocked use case -> real local HTTP/Functions host when credible, or smaller slice with real use case/adapters; assert status/body/headers/side effects.
- Use case with mocked partner client -> local HTTP stub plus real client adapter; assert stub-observed request and system result.

## Workflow

1. Cluster nearby unit tests by contract, not file.
2. Pick scenarios that would worry you in production.
3. Choose the honest boundary.
4. Replace mocks with real local dependencies or deterministic stubs.
5. Keep assertions meaningful under real execution.
6. Leave pure logic and combinatorial edges in unit tests.

Good end state: 1-2 runtime happy paths, a few narrower integration slices for dense variation, and unit tests still covering pure logic.
