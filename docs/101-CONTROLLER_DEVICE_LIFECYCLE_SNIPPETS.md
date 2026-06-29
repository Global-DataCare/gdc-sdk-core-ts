# Controller And Device Lifecycle Snippets

This `101` is intentionally short and copy/paste oriented.

Rule:

- use high-level builders, editors, and read helpers first
- keep raw GW JSON paths out of app code when a shared helper exists
- leave actual HTTP submit/poll execution to `gdc-sdk-node-ts` or
  `gdc-sdk-front-ts`
- UI/form claim editors usually live in `gdc-common-utils-ts`
- GW route/lifecycle helpers usually live in `gdc-sdk-core-ts`
- do not teach transport/adaptor plumbing as the main app-facing story

Transport-envelope rule:

- `sdk-core` teaches business request bundles and claim readers
- `sdk-node` / `sdk-front` teach submit/poll and actor-session execution
- `application/json` submission descriptors are plain HTTP transport wrappers
- `application/didcomm-plain+json` is a different outer submit mode used by
  some runtime flows
- `application/didcomm-encrypted+json` is reserved for encrypted outer
  envelopes and is not the default teaching path here

Primary readback helpers:

- `getClaimsInFirstDataEntry(...)` from `gdc-common-utils-ts`
- `readCommercialOfferId(...)` from `gdc-sdk-core-ts`
- `readActivationCode(...)` from `gdc-sdk-core-ts`

Architecture background lives in:

- [ARCHITECTURE_CONTROLLER_DEVICE_LIFECYCLES.md](./ARCHITECTURE_CONTROLLER_DEVICE_LIFECYCLES.md)

## 1. Legal Organization Controller

### 1.1 Build The First Verification Request

```ts
import {
  createLegalOrganizationOnboardingEditor,
} from 'gdc-common-utils-ts';

const onboarding = createLegalOrganizationOnboardingEditor()
  .setLegalIdentifierType('TAX')
  .setLegalIdentifierValue('B12345678')
  .setLegalName('Acme Clinic SL')
  .setControllerEmail('legal.rep@acme.org')
  .setServiceCategory('health-care')
  .setServiceIdentifier('did:web:provider.example.org')
  .setServiceUrl('https://provider.example.org');

const verificationRequest = onboarding.buildGatewayVerificationRequest({
  controller: controllerBinding,
  signatureFlow: 'certificate',
  signedTermsPdfUrl,
});
```

Real-flow note:

- in your stack this step normally starts from the signed antifraud/legal PDF
- the form fields may come from one UI form, one KYC source, or both
- the editor is only the normalized claim/form layer before transport
- the live reference fo this exact journey is:
  `gdc-sdk-node-ts/tests/101-organization-controller-lifecycle.live.test.mjs`
  and `gdc-sdk-node-ts/docs/101-SDK_END_TO_END.md`

Runtime handoff:

```ts
const orgAdmin = profile.asOrganizationController();

const transactionResult = await orgAdmin.submitLegalOrganizationVerificationTransaction(
  {
    jurisdiction: 'es',
    hostNetwork: 'test-network',
  },
  verificationRequest,
);

const transactionPollBody = transactionResult.poll.body;
```

Do not teach this `101` from:

- raw `Authorization` headers
- raw HTTP `body`
- `submission.endpointUrl`
- transport adaptor hooks

Those belong to runtime integration docs, not to lifecycle snippets.

### 1.2 Read Verification Credentials And Confirm The Order

```ts
import {
  readCommercialOfferId,
} from 'gdc-sdk-core-ts';

const offerId = readCommercialOfferId(transactionPollBody);
if (!offerId) {
  throw new Error('Missing commercial Offer after legal organization _transaction.');
}

const hostOnboardingSdk = profile.asHostOnboarding();

await hostOnboardingSdk.confirmLegalOrganizationOrder(
  {
    jurisdiction: 'es',
    hostNetwork: 'test-network',
    controllerDid: orgControllerDid,
  },
  { offerId },
);
```

Returned verification note:

- the accepted transaction response should expose the ICA verification result
- that result includes the `LegalOrganization` and `LegalRepresentative`
  credentials returned by ICA
- those credentials are the source of truth for the next controller-proof step
- use shared readers from `gdc-common-utils-ts`:
  - `readLegalOrganizationVerificationCredentialPairFromResponseBody(...)`
  - `readLegalOrganizationVerificationTaxIdFromResponseBody(...)`
  - `readLegalRepresentativeSameAsFromResponseBody(...)`
  - `readLegalRepresentativeBindingFromResponseBody(...)`

Runtime binding:

- for the first host `_transaction`, use one organization-controller session
  surface such as `profile.asOrganizationController()`
- in `gdc-sdk-node-ts`, `hostOnboardingSdk` usually comes from
  `profile.asHostOnboarding()` or a `NodeRuntimeClient`
- in `gdc-sdk-front-ts`, the equivalent actor session also exposes
  `asHostOnboarding()`
- do not teach `confirmLegalOrganizationOrderWithDeps(...)` in app-facing `101`
- that helper is internal plumbing for runtime adapters

If your app needs more than one field, prefer:

```ts
import { getClaimsInFirstDataEntry } from 'gdc-common-utils-ts';

const claims = getClaimsInFirstDataEntry(transactionPollBody.body);
```

### 1.3 Recovery / Rebind With `_issue`

```ts
import { readActivationCode } from 'gdc-sdk-core-ts';

const activationCode = readActivationCode(issuePollBody);
if (!activationCode) {
  throw new Error('Missing reissued controller activation code after Organization/_issue.');
}
```

Runtime execution for the next step belongs in `gdc-sdk-node-ts`:

- `Token/_exchange`
- `Device/_dcr`

## 2. Professional Device

### 2.1 Prepare The Professional Identity Claims

```ts
import { EmployeeDraft } from 'gdc-sdk-core-ts';

const employee = new EmployeeDraft()
  .setEmail('doctor1@acme.org')
  .setRole('ISCO-08|2211')
  .setMemberOfOrgTaxId('B12345678');

const employeeIdentifier = employee.ensureEmployeeIdentifier();
const employeeClaims = employee.toClaims();
```

### 2.2 Read The Activation Code Returned For Device Bootstrap

```ts
import { readActivationCode } from 'gdc-sdk-core-ts';

const activationCode = readActivationCode(licenseIssuePollBody);
if (!activationCode) {
  throw new Error('Missing professional activation code after License/_issue.');
}
```

Runtime execution for the actual device bootstrap belongs in `gdc-sdk-node-ts`,
for example through `activateEmployeeDeviceWithActivationRequest(...)`.

## 3. Individual Controller

### 3.1 Build The Commercial Individual Registration Request

```ts
import {
  createIndividualOnboardingFacade,
} from 'gdc-sdk-core-ts';
import { ClaimsOrganizationSchemaorg } from 'gdc-common-utils-ts/constants/schemaorg';

const onboarding = createIndividualOnboardingFacade()
  .createEditor()
  .setSelf(true)
  .setControllerAlternateName('Ana')
  .setControllerEmail('ana@example.com')
  .setControllerPhone('+34600000001')
  .setControllerIdentifier({ type: 'DNI', value: '12345678Z' })
  .setConsentDate('2026-06-29');

const claims = onboarding.buildClaims();
```

Runtime handoff:

```ts
const actor = profile.asIndividualController();

const startResult = await actor.startIndividualOrganization({
  alternateName: String(claims[ClaimsOrganizationSchemaorg.alternateName] || ''),
  controllerEmail: String(claims[ClaimsOrganizationSchemaorg.ownerEmail] || ''),
  controllerTelephone: String(claims[ClaimsOrganizationSchemaorg.ownerTelephone] || ''),
  additionalClaims: claims,
});

const individualTransactionPollBody = startResult.registration.poll.body;
```

Layering rule:

- in `gdc-sdk-core-ts`, `createIndividualOnboardingFacade()` is the high-level,
  runtime-neutral claim builder
- in `gdc-sdk-node-ts` and `gdc-sdk-front-ts`, app code usually enters through
  `profile.asIndividualController()` and lets `IndividualControllerSdk`
  orchestrate submit/poll calls
- do not confuse the core claim editor with the runtime actor/session manager

### 3.2 Read The Commercial Offer

```ts
import { readCommercialOfferId } from 'gdc-sdk-core-ts';

const offerId = readCommercialOfferId(individualTransactionPollBody);
if (!offerId) {
  throw new Error('Missing commercial Offer after individual organization _transaction.');
}
```

### 3.3 Recovery Policy Shape

Use this decision model in app code:

```ts
const recoveryPolicy = {
  mode: 'service-signed-assisted-recovery',
  requireIdToken: true,
  requireMfa: userPrefersMfa || serviceRequiresMfa,
  allowOldKeyProof: true,
} as const;
```

Accepted modes:

- service-signed assisted recovery
- authenticated `id_token` session recovery
- optional stronger old-key proof when available

This `101` does not define the final transport route for individual-controller
rotation. It defines the copy/paste policy shape that app code should preserve.
