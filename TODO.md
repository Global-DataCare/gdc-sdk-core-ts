# TODO - gdc-sdk-core-ts

## NOW
1. Define the runtime-neutral contract for individual-member invitation, license activation, and active relationship resolution.
2. Keep `RelatedPerson` as the canonical active relationship projection while separating invitation/license state from final membership state.
3. Add shared builders/types for `related-profiles` query inputs and active relationship summaries derived from normalized claims.
4. Clarify baseline individual-seat semantics in docs and contracts:
   - first seat auto-consumed by the individual controller
   - default bundle of 2 seats
   - 0 EUR baseline with no payment-proof requirement

## NEXT
1. Add capability/session helpers for selecting an active related profile from the resolved relationship list.
2. Add tests for normalized role/controller/member summaries independent of the underlying FHIR version.

## LATER
1. Extend the same contract family to additional member classes if GW introduces non-`RelatedPerson` individual-member lifecycle resources.
