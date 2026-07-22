# TODO - Bundle Change Reconciliation MVP

Authoritative plan: `docs/MVP_BUNDLE_CHANGE_RECONCILIATION_PLAN.md`.

## P0/P1 - Additive and MVP-safe

- [ ] Add a pure, runtime-neutral
  `analyzeBundleChangesResponse(changesBundle, responseBundle)` helper.
- [ ] Return successful, failed and pending identifiers plus diagnostics; do
  not accept, merge or mutate a frontend display Bundle.
- [ ] Add complete JSDoc and positive, partial-failure, ambiguous and malformed
  response tests.
- [ ] Keep the existing durable outbox status/repository contract stable.
- [ ] Do not add clinical, Consent, RelatedPerson, Task or product-specific
  search routes to Core.

## P3 - After portal adoption

- [ ] Evaluate an optional generic submit/readback coordinator with injected
  runtime functions. Keep it out of the MVP critical path.
- [ ] Require typed readback evidence before transitioning a durable job from
  `reconciling` to `confirmed`.

