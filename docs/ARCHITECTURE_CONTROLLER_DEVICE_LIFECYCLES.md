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
- [gwtemplate-node-ts/docs/API_CORE_INTEGRATION.md](https://github.com/Global-DataCare/gwtemplate-node-ts/blob/main/docs/API_CORE_INTEGRATION.md)

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
  single-use code that unlocks `Token/_exchange` and then `Device/_dcr`
- **commercial Offer**:
  output that later requires `Order/_batch`

Do not collapse those terms into one "key" concept.

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
The controller/employee role and organization stay the same; each installation
has its own public/private keys and DCR technical client. Do not transfer a
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

The ICA retains the accredited identity/designation and initial evidence.
Adding or revoking an operational device does not automatically revoke that
identity credential. Later operations check current host/device/ledger state;
the initial ICA key binding is not blanket authorization for every new key.

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
