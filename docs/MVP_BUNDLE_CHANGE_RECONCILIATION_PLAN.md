# MVP Bundle Change And Confirmation Plan

## Goal

Ship an application MVP without replacing working client flows or confusing the
frontend display copy with the Bundle sent to GW.

Four values must remain separate:

1. `displayBundle`: the frontend's in-memory copy used only for rendering;
2. `changesBundle`: only resources created or modified by the current action;
3. `responseBundle`: the GW result for those submitted changes;
4. `searchResultBundle`: the fresh authoritative result of the corresponding
   clinical, Consent, RelatedPerson or other resource search.

`displayBundle` is never attached to Communication. `changesBundle` is never
merged into it by a shared SDK helper.

## MVP-safe sequence

### P0: documentation and characterization

- Add JSDoc and executable tests for the four-value contract.
- Keep every currently published API and portal adapter working.
- Do not publish or adopt the current merge-oriented frontend working-copy
  helper as the canonical contract.
- Characterize every adopting web, native and assisted channel before moving code.
- Do not rename packages, endpoints or persisted outbox records.

### P1: additive Core helpers

- Add a pure `analyzeBundleChangesResponse(changesBundle, responseBundle)`
  helper to `gdc-sdk-core-ts`.
- Return successful, failed and pending resource identifiers plus GW
  diagnostics. Do not mutate or receive `displayBundle`.
- Keep authoritative refresh outside the helper: each caller executes the
  correct search and replaces its own display copy.
- Add clear JSDoc stating what is sent, what stays local and what proves
  persistence.

### P2: runtime adoption after the MVP path remains green

- `gdc-sdk-node-ts`: expose submit/poll plus resource-specific readback
  composition without owning UI state.
- `gdc-sdk-front-ts`: consume the Core analysis helper from browser and Expo;
  keep a compatibility export for any previous working-copy helper.
- Application web and assisted channels: adopt one operation at a time behind existing API
  responses and tests.
- Other applications: consume the published helper only when their first real mutation
  flow exists; do not block its current contract work.

### P3: durable coordinator, not required to ship the MVP UI

- Keep durable outbox states and repository ports in `gdc-sdk-core-ts`.
- Add an optional submit/readback coordinator only after P1/P2 are proven.
- A job may be `confirmed` only after its operation-specific search finds the
  expected persisted result. Submit/poll acknowledgement alone is not enough.

## Release gates

- No portal sends `displayBundle`.
- No shared helper merges `changesBundle` into `displayBundle`.
- Partial failures are correlated by stable resource identifier.
- Missing results remain pending until search/readback.
- Application web tests cover clinical, Consent, RelatedPerson and care resources.
- Telephone tests distinguish human confirmation from technical GW readback.
- Every application remains buildable without adopting unreleased SDK APIs.
- Publish shared packages before changing portal registry dependencies.
