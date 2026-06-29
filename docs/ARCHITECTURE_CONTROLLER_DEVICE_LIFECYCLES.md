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

### 1.2 Existing Organization Controller Recovery

Canonical intent:

- reverify or rebind the current controller for an existing tenant
- do not create a new commercial Offer
- do not run a new Order flow

Shared contract:

1. submit `Organization/_issue`
2. consume `_issue-response`
3. require one reissued activation code in
   `meta.claims['org.schema.IndividualProduct.serialNumber']`
4. continue with:
   - `Token/_exchange`
   - `Device/_dcr`

Commercial rule:

- `_issue` is a recovery/rebind path
- `_issue` must not mint a new Offer
- `_issue` must not require `Order/_batch`

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

### 2.2 Professional Device Replacement

Canonical intent:

- reuse the same professional seat
- replace the previous device profile
- avoid consuming a second seat for the same actor by mistake

Current GW-aligned behavior:

1. the seat remains tied to the same professional identity
2. a new activation code can be issued for replacement
3. `Device/_dcr` binds the new `client_id` and new public JWK set
4. the previous local device profile is revoked
5. the actor `didDocument` keeps the new device verification methods and drops
   the replaced ones

Important non-goal:

- `Device/_dcr` is not the human identity proof by itself
- `Device/_dcr` registers the technical client/device keys

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
