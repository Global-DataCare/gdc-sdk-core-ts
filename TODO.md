# TODO - gdc-sdk-core-ts

## NOW
1. Define the runtime-neutral contract for individual-member invitation, license activation, and active relationship resolution.
2. Keep `RelatedPerson` as the canonical active relationship projection while separating invitation/license state from final membership state.
3. Add shared builders/types for `related-profiles` query inputs and active relationship summaries derived from normalized claims.
4. Expand the high-level bundle authoring surface beyond employee-only helpers:
   - add typed entry editors/builders for `RelatedPerson`, `License`, `Offer`, and `Order`
   - keep the same `newEntry() -> asX() -> set/get claims -> doneEntry()` ergonomics already used by `Employee`
   - avoid forcing frontend/BFF code to handcraft `meta.claims`, request `type`, or route-specific bundle shapes inline
5. Add shared high-level search bundle builders beyond the current employee-only path:
   - `RelatedPerson` search bundle helpers
   - license search bundle helpers
   - stable `Offer` / `Order` lookup bundle helpers where the runtime still uses batch-style payloads
   - resource-neutral aggregation/query DTOs for controller views
6. Add canonical runtime-neutral DTOs/builders for `License`, `Offer`, and `Order` instead of passing only raw ids/claims through onboarding flows:
   - explicit `OfferPreview` / `OrderSummary` contracts
   - shared claim readers/writers for payment URL, accepted-offer id, activation code, and seat counts
   - frontend/BFF-facing helpers that do not require callers to parse `org.schema.*` claims manually
7. Clarify baseline individual-seat semantics in docs and contracts:
   - first seat auto-consumed by the individual controller
   - default bundle of 2 seats
   - 0 EUR baseline with no payment-proof requirement
8. Define the canonical license-controller query contract used by frontend/BFF/runtime layers:
   - available / issued / active / inactive seat filters
   - contracted / used / free counters
   - summaries grouped by `userClass`, `type`, and optional role/email target
   - DTOs that do not leak GW vault-internal storage details to app code
9. Define the canonical consent-management contract used by frontend/BFF/runtime layers:
   - consent draft DTOs for individual and legal-organization controllers
   - actor-target descriptors for `professional`, `organization`, `department`, `office`, `related-person`, and `individual`
   - operation contracts for add/update/remove/disable/enable/delete on grouped consents
   - preview contract for grouped consent -> atomic-rule expansion
   - diff contract for original vs updated consent state
10. Define canonical frontend-facing query/filter contracts for consent views:
   - query by actor type
   - query by professional selector (`email`, `phone`)
   - query by `did:web` target
   - grouped collection views handled in-memory by frontend before submit
11. Define the shared clinical-import contract for "Agregar datos":
   - `ClinicalImportDraft`
   - `ClinicalImportMetadata`
   - `ClinicalImportValidationResult`
   - resource-family-aware draft helpers for later FHIR R4 / IPS delivery
12. Define runtime-neutral `RelatedPerson` view/query contracts:
   - professional invitation/contact views
   - individual/family contact views
   - emergency-contact views
   - unified filtering contract for frontend tables and selectors
13. Define the runtime-neutral unified-view / IPS query contract:
   - filter by section
   - filter by clinical date/date range
   - expose `code.text`/display extraction in a stable DTO
   - expose XHTML availability vs XHTML generation-needed state
   - define render/query DTOs consumable by frontend and BFF layers

## NEXT
1. Add capability/session helpers for selecting an active related profile from the resolved relationship list.
2. Add tests for normalized role/controller/member summaries independent of the underlying FHIR version.
3. Add tests for grouped-consent preview/diff contracts and clinical-import draft validation contracts.
4. Add tests for unified-view / IPS filter and render contracts.

## LATER
1. Extend the same contract family to additional member classes if GW introduces non-`RelatedPerson` individual-member lifecycle resources.
