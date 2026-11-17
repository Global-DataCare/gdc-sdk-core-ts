# Controller And Device Lifecycles

This document is the canonical shared architecture note for the three
actor/device families that currently cause most onboarding and recovery
confusion across GW, SDK Node, portal/BFF, and frontend runtimes.

It is intentionally runtime-neutral:

- `gdc-sdk-core-ts` defines the lifecycle model and evidence expectations
- `gdc-sdk-node-ts` and `gdc-sdk-front-ts` execute concrete runtime calls
- `gwtemplate-node-ts` implements the backend routes and persistence semantics

Use this document together with:

- [101-CONTROLLER_DEVICE_LIFECYCLE_SNIPPETS.md](./101-CONTROLLER_DEVICE_LIFECYCLE_SNIPPETS.md)
- [101-SDK_FLOWS.md](./101-SDK_FLOWS.md)
- [gdc-sdk-node-ts/docs/101-ORGANIZATION_CONTROLLER_LIFECYCLE.md](https://github.com/Global-DataCare/gdc-sdk-node-ts/blob/main/docs/101-ORGANIZATION_CONTROLLER_LIFECYCLE.md)
- [GW API Core Integration](https://github.com/Global-DataCare/gwtemplate-node-ts/blob/main/docs-v1/02-API-AND-ENDPOINTS/02.D-API-CORE-INTEGRATION.md)

## Scope Rule

This document covers only these lifecycle families:

1. legal organization controller recovery / device rebind
2. professional device activation / replacement
3. individual controller key/device recovery

It does not redefine broader consent, communication, or tenant lifecycle flows.

## Shared Vocabulary

- **controller business key**:
  person/actor signing key carried in `controller.*` business payload fields
- **runtime transport key**:
  app, device, portal, or BFF communication key used for JOSE/DIDComm/FAPI
- **device profile**:
  one registered OAuth/DCR technical client bound to one seat or actor
- **activation code**:
  licence-issued code used by `Token/_exchange` before `Device/_dcr`; a modern
  multi-device seat may reuse that code while valid and within its device allowance
- **commercial Offer**:
  output that later requires `Order/_batch`

Do not collapse those terms into one "key" concept.

## Start Here: One Shared Wallet Or Two Independent Wallets?

A browser is the screen; the BFF (Backend for Frontend) is the portal's server.
In the examples below, that server holds the encrypted managed wallet. The
PIN unlocks that existing wallet through the BFF; it does not create an identity
or get sent to the gateway.

| What the person does | What the BFF does | Gateway device registration |
| --- | --- | --- |
| Opens the same portal on another browser or computer, with the same server-side profile store and KMS custody | Reopens the same stored profile with its PIN and a fresh authenticated login | Reuses its existing keys, `clientId` and `clientInstanceId`; no new enrollment |
| Opens a second portal with its own independent BFF wallet custody | Creates and registers that portal's own wallet/profile after checking existing role and licence authority | Adds another installation with different keys, `clientId` and `clientInstanceId` |
| Replaces the keys of an existing installation | Runs the authorized replacement/recovery flow for that installation | Reuses its installation id and replaces the previous key binding |

Two URLs do not necessarily mean two wallets. Two portals that deliberately
share the same protected BFF profile may reuse it; two independent BFF stores
must not copy each other's seed or private keys. Likewise, another browser
only creates another installation when the product actually keeps a separate
wallet there. These examples cover server-managed wallets, not browser-local
wallet storage.

### Same Portal, Another Browser Or Computer

For example, a controller uses the health portal on a laptop, then signs into
the same portal on another computer. Both browsers reach the same protected
profile through that portal's BFF:

1. Authenticate the person and verify the account contact.
2. Select the existing profile owned by that authenticated account, on the server.
3. Ask for its PIN (or use the BFF's already-authorized passkey/session path).
4. Call `openOrganizationController(...)` to reopen the stored wallet. Keep the
   original `profileId`, wallet derivation identity and registered public keys.
5. Use the returned role-scoped `sdk` for the operation. The gateway still checks
   its current permissions. Do not call `enroll(...)` on every login.

This is a Node BFF call. Install/import `gdc-sdk-node-ts`; `gdc-sdk-core-ts`
alone does not create, store or unlock a managed wallet:

```ts
import {
  ServerProfileSessionManager,
  type ServerOrganizationControllerOpenInput,
  type ServerProfileSessionManagerOptions,
} from 'gdc-sdk-node-ts';

export async function reopenControllerInThisBff(
  options: ServerProfileSessionManagerOptions,
  input: Pick<ServerOrganizationControllerOpenInput,
    'ownerId' | 'profileId' | 'idToken'> & { pin: string },
) {
  const manager = new ServerProfileSessionManager(options);
  return manager.openOrganizationController(input);
}
```

`options` contains this BFF's existing durable `store`, KMS-backed `sealer`,
`gatewayBaseUrl`, trusted public `resolveRecipientJwk` and configured `appInfo`.
`ownerId` comes from the authenticated account; `profileId` comes from that
account's stored profiles; `idToken` is fresh, signed OpenID account proof;
`pin` unlocks the existing profile. Do not return the protected profile or
wallet material to the browser. For the already-authorized server-only unlock
alternative, see [Node SDK section 6.4](https://github.com/Global-DataCare/gdc-sdk-node-ts/blob/main/docs/101-SDK_END_TO_END.md#64-create-an-employee-or-professional-under-the-organization).

The historical representative created by legacy ICA `_verify` -> GW `_activate`
is a separate bootstrap case: retain and reopen its original wallet/context.
Do not turn that existing legacy binding into a new modern profile by calling
`enroll(...)`. Follow [the legacy walkthrough](https://github.com/Global-DataCare/gdc-sdk-node-ts/blob/main/docs/101-SDK_END_TO_END.md#legacy-pdf-verify-activate)
for that original integration.

### Second Independent Portal: Add A Wallet, Keep The First

Suppose the same controller uses a health portal and a veterinary portal with
separate BFF custody. First determine whether both actually use the **same
hosted organization, provider DID, jurisdiction, sector and licensed actor**.
Only in that case is this another device under the same existing binding.

If the portals use different sectors or hosted organizations, the same legal
company identifier does not make their routes or role DIDs interchangeable.
Resolve the second portal's actual provider DID and route, and establish its
controller designation and active sector-specific role/licence policy first.
The existing licence may cover several sectors only when its actual server-side
policy says so. Changing `routeContext.sector` or reusing an old activation code
cannot establish that authority. Once the target binding is authorized, the
same SDK device-enrollment procedure applies to that target.

1. In the second BFF, resolve the target's existing controller/role authority
   from verified server records. A matching email alone is not that authority.
2. Obtain the actual `activationCode` returned for that target by its original
   completed Order or licence issuance. Use the protected code retained by the
   issuing BFF while it remains valid; a modern active seat supports additional
   installations within its allowance. This is not an identifier made from an
   email. If the code is no longer available or valid, use the authorized
   reissuance/recovery process separately; there is no SDK getter that recovers
   it from an email alone.
3. Configure the second BFF's own store, KMS sealer, gateway and recipient-key
   resolver. Obtain a fresh OpenID `idToken` trusted by that gateway.
4. Generate a new local `profileId` and call `enroll(...)` once. Omit the old
   `walletSeed`, `walletKeyDerivationId` and `clientInstanceId`: the SDK creates
   fresh wallet material and derives a distinct installation id.
5. Keep the returned protected profile. Subsequent logins to this second portal
   follow the reopening example above. Verify that the first portal still works.

### Where Each Enrollment Input Comes From

`enroll(...)` performs registration; it does not discover a controller or
professional from an email address. The BFF must retain the results of the
original authorized onboarding/invitation. This is the concrete input contract:

| Input | Actual source |
| --- | --- |
| `activationCode` for original organization onboarding | `readActivationCode(order)` after `HostOnboardingSdk.confirmLegalOrganizationOrder(...)` confirms the original returned Offer |
| `activationCode` for a professional invitation | `OrganizationControllerSdk.provisionOrganizationEmployee(...).activationCode`, or `readEmployeeActivationCode(reply.poll.body)` after the original `issueOrganizationEmployeeLicense(...)` |
| `actorDid`, `profileDid`, `providerDid`, `routeContext`, `allowedSubjectDids` | The existing `ServerProfileRecord` returned by the original successful `enroll(...)`; export only the authorized public binding to the second BFF, never the whole protected record |
| Professional role/contact proof | The original verified employment/licence grant, for example the typed `EmployeeActivationGrant` built with `createEmployeeActivationGrant(...)`; use its `employeeDid`, `employeeRoleCode`, `employeeActorIdentifier`, `providerDid` and `routeContext` |
| Controller role/contact proof | The verified controller designation and matching licence/contact binding; `HealthcareActorRoles.Controller` from `gdc-common-utils-ts/constants/healthcare` supplies the canonical role value only after that designation is established |
| `ownerId`, `idToken` | This BFF's authenticated account id and its fresh signed OpenID token |
| `profileId` | A new local `randomUUID()` for the additional wallet; save and reuse the returned record later |
| `pin`, redirects and client name | The second portal's wallet unlock and approved application configuration |
| `options` | Existing BFF `store`, KMS `sealer`, `gatewayBaseUrl`, trusted `resolveRecipientJwk` and optional `appInfo` |

The SDK's public `ServerActorMode` is a TypeScript union, not an exported enum:
`'self' | 'controller' | 'member'`. Organization controllers use `'controller'`;
employees/professionals use `'member'`. These API mode values do not establish
role authority and are separate from professional occupation codes.

For example, the original controller onboarding obtains its code from a real
Order response through the exported Core readers. `organizationActivation`
is the completed reply from `activateOrganizationInGatewayFromIcaProof(...)`
(legacy path) or `submitLegalOrganizationVerificationTransaction(...)`:

```ts
import {
  HostOnboardingSdk,
  type SubmitAndPollResult,
} from 'gdc-sdk-node-ts';
import { readCommercialOfferId, readActivationCode } from 'gdc-sdk-core-ts';

export async function acceptOriginalOrganizationOffer(
  onboarding: HostOnboardingSdk,
  route: Parameters<HostOnboardingSdk['confirmLegalOrganizationOrder']>[0],
  organizationActivation: SubmitAndPollResult,
) {
  const offerId = readCommercialOfferId(organizationActivation);
  if (!offerId) throw new Error('Organization reply did not return an Offer.');
  const order = await onboarding.confirmLegalOrganizationOrder(route, { offerId });
  const activationCode = readActivationCode(order);
  if (!activationCode) throw new Error('Order reply did not return an activation code.');
  return { order, activationCode };
}
```

Run that Order only in the original onboarding that returned the Offer. Store
its actual code under the issuing BFF's protection if its lifecycle permits
later device additions; do not repeat the Order or issue another seat merely
to open a second portal. An original legacy `_activate` that already bound the
representative without an Order follows its existing legacy lifecycle instead.

For current GW Core, the supported exchange input is the activation code:
`IdentityTokenManager` requires `body.subject_token`. Although the SDK type also
declares `employeeAuthorizationUrn`, the current gateway exchange does not
implement that alternative. Do not substitute a URI/URN for the code here.
Neither `StaticAuthorityResolver` nor a DID builder discovers or grants the
missing role/licence authority: the resolver uses preloaded/configured routing.
If the original authorized binding/grant is unavailable, the BFF must resolve it
through its governed organization/invitation integration before enrollment;
GDC currently has no public account-to-existing-actor discovery facade that
returns every field in this table.

The helper below consumes those explicitly retained values. `authority` is
only the authorized public projection described above; `professionalProof`
is supplied from the separate verified role grant, not a `ServerProfileRecord`
field or an unverified decoding of its protected VP:

```ts
import { randomUUID } from 'node:crypto';
import { ActorKinds } from 'gdc-common-utils-ts/constants/actor-session';
import {
  ServerProfileSessionManager,
  type ServerProfileEnrollmentInput,
  type ServerProfileSessionManagerOptions,
} from 'gdc-sdk-node-ts';

type ExistingControllerAuthority = Pick<ServerProfileEnrollmentInput,
  'ownerId' | 'actorDid' | 'providerDid' | 'routeContext' | 'allowedSubjectDids'
> & {
  professionalProof: NonNullable<ServerProfileEnrollmentInput['professionalProof']>;
};

export async function addControllerWalletInThisBff(input: Readonly<{
  options: ServerProfileSessionManagerOptions;
  authority: ExistingControllerAuthority;
  activationCode: string;
  idToken: string;
  pin: string;
  redirectUris: string[];
  clientName: string;
}>) {
  return new ServerProfileSessionManager(input.options).enroll({
    ...input.authority,
    activationCode: input.activationCode,
    profileId: randomUUID(),
    actorKind: ActorKinds.OrganizationController,
    actorMode: 'controller',
    profileDid: input.authority.actorDid,
    idToken: input.idToken,
    pin: input.pin,
    redirectUris: input.redirectUris,
    clientName: input.clientName,
  });
}
```

The SDK owns the signed/encrypted exchange, initial access token, DCR and
protected profile persistence. The PIN and private keys remain outside those
HTTP requests. `professionalProof` is the verified role/contact proof source;
the SDK signs its managed proof after DCR. For an existing modern organization
controller, use `actorMode: 'controller'`, matching the controller-opening API.

For an already-authorized employee/professional installation, the same `enroll(...)`
call uses `actorKind: ActorKinds.OrganizationEmployee` and `actorMode: 'member'`,
with that person's own actor DID, role proof and licence authorization. Later
reopen it through `openProfessional(...)`, not `openOrganizationController(...)`.

Check the licence's effective `maxDevices`: the gateway enforces the explicit
value, or its default when absent. An added installation consumes device
capacity, not another controller identity. Reusing an existing installation id
with new keys selects replacement behavior; `rotateEmployeeProfileWithOtp(...)`
is a replacement helper, not the way to keep two independent portals active.

## 1. Legal Organization Controller Lifecycle

### 1.1 New Organization Onboarding

There are two entry paths. Select the one already used by the integrating
portal; adding another portal/device does not migrate the original onboarding.

| Entry path | Sequence |
| --- | --- |
| Host-led registration | Signed PDF -> GW `Organization/_transaction` -> returned Offer -> `Order/_batch` -> controller device exchange/DCR when required |
| Legacy ICA proof-first registration | Signed PDF -> ICA `_verify` / `_verify-response` -> controller-signed VP -> GW `Organization/_activate` / `_activate-response` -> returned Offer -> `Order/_batch` when required |

The following list describes the host-led path; the legacy path is explained
separately immediately below.

Canonical intent:

- verify legal evidence
- create the hosted organization
- mint the commercial Offer
- confirm the Offer
- activate the first controller device

Shared contract:

1. host legal organization verification starts with `Organization/_transaction`
2. the successful response must expose `meta.claims['org.schema.Offer.identifier']`
3. that Offer is confirmed through `Order/_batch`
4. the accepted order returns the first controller activation code
5. the controller device becomes technically active only after:
   - `Token/_exchange`
   - `Device/_dcr`

Important split:

- `Organization/_transaction` and `Order/_batch` are commercial/legal steps
- `Token/_exchange` and `Device/_dcr` are controller device bootstrap steps

### Legacy PDF verification and host activation

This is the existing proof-first integration for a portal that verifies its
signed organization PDF directly with the ICA before calling the host. It is
not `Organization/_transaction`, and it does not require changing the portal
just because the host-led path is documented first.

1. The portal submits the certificate-signed PDF and the required public-key
   bindings to ICA:
   `POST /ica/cds-{jurisdiction}/v1/{sector}/{networkKind}/pdf/{resourceType}/_verify`.
2. It follows the returned `Location` and polls `_verify-response` to obtain
   the ICA-issued credentials. The document signature, representative identity
   and controller designation remain distinct evidence.
3. The controller wallet builds and signs the verifiable presentation (VP)
   from those credentials. The account login token does not replace this VP.
4. The SDK submits that proof and the public controller binding to
   `POST /host/cds-{jurisdiction}/v1/{sector}/registry/org.schema/Organization/_activate`
   through `HostOnboardingSdk.activateOrganizationInGatewayFromIcaProof(...)`.
   The portal follows `Location` for `_activate-response`. In this host registry
   route, the sector slot is the deployment's onboarding network selector;
   do not substitute the ICA's business sector without checking route context.
5. When activation returns a commercial Offer, the portal confirms it through
   `Order/_batch` using the returned identifier and existing SDK readers.
6. Historical representative bootstrap already binds the submitted role key
   and supplied communication JWKS during `_activate`. That same initial
   binding does not repeat `Token/_exchange` or `Device/_dcr`. The portal
   retains the protected wallet seed and stable wallet context so it can use
   the registered keys later. A separately registered controller/device uses
   its own authorized exchange/DCR flow; it does not inherit that exception.

The complete input example, shared builders, wallet context and custody rules
are maintained once in
[Node SDK: legacy PDF / verify / activate walkthrough](https://github.com/Global-DataCare/gdc-sdk-node-ts/blob/main/docs/101-SDK_END_TO_END.md#legacy-pdf-verify-activate).
The [controller lifecycle evidence](https://github.com/Global-DataCare/gdc-sdk-node-ts/blob/main/docs/101-ORGANIZATION_CONTROLLER_LIFECYCLE.md#what-proves-this-contract)
identifies the executable coverage for both entry paths. These references
separate the original bootstrap from later controller recovery and additional
devices instead of treating every login as another activation.

### 1.2 Existing Organization Controller Recovery

Canonical intent:

- reverify/reissue the existing organization's ICA credentials
- expose activation material for the current controller License as a separate
  claims projection
- let the later DCR sequence rebind the current controller device
- do not create a new commercial Offer
- do not run a new Order flow

Shared contract:

1. submit `Organization/_issue`
2. consume `_issue-response` and keep its projections distinct:
   - `vc[]`: all deduplicated ICA-issued VCs
   - `resource.icaResponse`: complete raw ICA response
   - `meta.claims`: host claims, including the activation code
3. require the activation code in
   `meta.claims['org.schema.IndividualProduct.serialNumber']`; it is not a VC
4. continue with:
   - `Token/_exchange`
   - `Device/_dcr`

Commercial rule:

- `Organization/_issue` is organization credential reissuance/reverification;
  it is not `License/_issue` and does not itself register a device
- a typed `License:Issued` entry belongs to `License/_issue`, not to the
  canonical `Organization/_issue-response`
- `OperationOutcome.issue[]` is an unrelated diagnostics array
- `Organization/_issue` must not mint a new Offer or require `Order/_batch`
- `Token/_exchange -> Device/_dcr` performs the actual device activation/rebind

Evidence rule:

- the current controller business binding key belongs in `controller.*`
- runtime envelope keys must not replace that business key

## 2. Professional Device Lifecycle

### 2.1 First Professional Invitation

Canonical intent:

- reserve one professional seat
- issue one activation code for that professional
- register one concrete device/app profile

Shared contract:

1. reserve or reissue seat through `License/_issue`
2. exchange activation code through `Token/_exchange`
3. register device technical client through `Device/_dcr`

Legacy bootstrap exception: historical `Organization/_activate` binds the
submitted representative public key as part of tenant creation. That same
bootstrap representative does not repeat token exchange or DCR. The shared
three-step contract applies to later service controllers, employees and device
replacement/recovery.

### Additional Device For The Same Controller Or Professional

The same person can use independent registered wallets in different portals.
When both portals target the same authorized provider, route and licensed
actor, that binding stays the same; each independent installation has its own
public/private keys and DCR technical client. Different sectors require their
own authorized routing and active licence policies, as explained above. Do not transfer a
private key merely to make another portal usable.

The backend resolves the existing licensed actor for the authenticated contact,
then the Node runtime performs `Token/_exchange -> Device/_dcr` for the added
installation. Email proves the authenticated account, not the controller role.
The device remains subject to current role, licence and device authorization.

The gateway uses the licence's explicit `maxDevices`, or its current default
of five when absent. This is an active-device capacity, not five licences or
five controllers. A licence explicitly set to two does not become five when
a SDK constant changes. The portal must respect the effective server value.

A new installation has a distinct `clientInstanceId`; a same-installation
replacement reuses that installation id with new keys. Normal SDK enrollment
derives the installation id from the managed wallet, so do not hand-build it
from an email, role or organization DID. Preserve and reopen the stored profile
on subsequent logins instead of enrolling again.

The additional-wallet/device mechanism is the same for an organization
controller and a professional: a separately authorized installation supplies
its own keys and completes exchange/DCR. Their authority remains different:
controller designation is not an employment/professional grant, and the same
account contact cannot replace either check.

The ICA-signed credential records the controller binding used for its issuing
verification, rather than a live list of every operational device. The
[ICA credential builder](https://github.com/Global-DataCare/dataspace-ica-ts/blob/main/src/api/tools/vc-bundle.ts)
places that key commitment in
`ServiceControllerCredential.credentialSubject.owner.hasCredential.material`
and records the verification timestamp in `validFrom`. Adding a device does
not require rewriting that signed credential or synchronizing the ICA with
every device change. Identity/designation renewal or revocation remains its
own governed lifecycle.

The host maintains current DCR profiles, public DID methods and active
role/licence/device bindings. In a Fabric-backed deployment, its
[device-registration manager](https://github.com/Global-DataCare/gwtemplate-node-ts/blob/main/src/managers/DeviceRegistrationManager.ts)
registers the corresponding public keys and bindings in Fabric. A distinct
installation keeps the existing installations active. When an authorized
replacement selects the same `clientInstanceId`, the host revokes only that
installation's previous binding and registers its replacement. Private keys
stay in their wallets. Later access depends on current authorized state, not
just the historic ICA key commitment.

Runtime code, imports, input sources, KMS/profile storage and the numbered
additional-portal walkthrough live in
[gdc-sdk-node-ts: Add the same controller from a second portal](https://github.com/Global-DataCare/gdc-sdk-node-ts/blob/main/docs/101-SDK_END_TO_END.md#add-the-same-controller-from-a-second-portal-keep-both-devices).
Keep that implementation example in the Node runtime owner rather than copying
wallet/HTTP orchestration into SDK Core.

### 2.2 Professional Device Replacement

Canonical intent:

- reuse the same professional seat
- replace the previous device profile
- avoid consuming a second seat for the same actor by mistake

Current GW-aligned behavior:

1. the seat remains tied to the same professional identity
2. a new activation code can be issued for replacement
3. `Device/_dcr` binds the new `client_id` and new public JWK set
4. the previous local device profile for that same installation is revoked
5. the actor `didDocument` keeps the new device verification methods and drops
   the replaced ones

Important non-goal:

- `Device/_dcr` is not the human identity proof by itself
- `Device/_dcr` registers the technical client/device keys

The preceding exchange has two independent inputs. A signed OIDC `id_token`
from a GW-trusted issuer proves the authenticated account and verified email
bound to the seat. A controller/professional `vp_token` proves credential and
role authority but cannot replace that email proof. A managed wallet can hold
the issuer signing key and create the compact JWT; the portal/BFF remains the
OpenID Provider and owns email verification, provider discovery, public JWKS
publication and exact issuer/audience trust configuration with GW.

### 2.3 Managed Key Clarification

For professional devices, the canonical DCR contract expects externally
provided `jwks` or `jwks_uri` for the device profile being registered.

Do not describe the normal professional device replacement path as "GW creates
the professional signing key during DCR". That is not the current canonical
device-replacement contract.

## 3. Individual Controller Recovery

This lifecycle is closed at the contract-decision level even though its runtime
surface still needs converged implementation across products.

### 3.1 Goal

Recover or rotate the individual controller's public signing continuity without
silently treating a portal runtime key as the controller's personal key.

### 3.2 Accepted Recovery Modes

The accepted recovery modes are:

1. **service-signed assisted recovery**
   - request is signed by the trusted portal/BFF/service runtime
   - the service applies its own recovery policy and audit controls

2. **user/session recovery**
   - authenticated `id_token`
   - plus MFA when the user or service policy requires it

Old-key proof remains a stronger optional continuity proof when available, but
it is not the only allowed recovery mode.

### 3.3 Security Rule

Keep these layers separate:

- portal/BFF runtime signature proves the trusted service channel
- `id_token` proves authenticated user session
- MFA proves stronger possession of enrolled factors
- old-key proof proves cryptographic continuity with the previous controller key

No single one of those should be misdescribed as automatically proving all the
others.

### 3.4 Portal And Assisted Flows

For shared portal or assisted-service operation:

- the rotation request may be signed by the portal/BFF/service runtime
- the service may additionally require:
  - authenticated email session
  - phone/email MFA
  - both, depending on policy

The runtime technical key is still not the same thing as the controller's
personal business-signing key.

### 3.5 Optional Stronger Continuity Proof

When available, the flow may also carry a `vp_token` or equivalent proof signed
by the old individual-controller key.

This is stronger than plain session recovery, but it is optional, not mandatory
for every supported recovery path.
