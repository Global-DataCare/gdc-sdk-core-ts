# V2 Profile Runtime Migration

## Purpose

This note captures how the legacy `old/gdc-sdk-client-ts` session/runtime
surface should be decomposed into the v2 package boundaries:

1. `gdc-common-utils-ts`
2. `gdc-sdk-core-ts`
3. `gdc-sdk-node-ts`
4. `gdc-sdk-front-ts`

The immediate goal is to recover the useful semantics behind:

- `JobManager`
- `ProfileManager`
- `ClientSDK.initializeSession(...)`
- vault-backed job synchronization
- actor-scoped service materialization
- trusted device registration
- subject-index connection and composition read

without reintroducing the old package coupling.

## Legacy Source Anchors

The primary legacy references are:

- [old/gdc-sdk-client-ts/src/interfaces/IJobManager.ts](</Users/fernando/GITS/gdc-workspace/old/gdc-sdk-client-ts/src/interfaces/IJobManager.ts:1>)
- [old/gdc-sdk-client-ts/src/JobManager.ts](</Users/fernando/GITS/gdc-workspace/old/gdc-sdk-client-ts/src/JobManager.ts:1>)
- [old/gdc-sdk-client-ts/src/ProfileManager.ts](</Users/fernando/GITS/gdc-workspace/old/gdc-sdk-client-ts/src/ProfileManager.ts:1>)
- [old/gdc-sdk-client-ts/src/ClientSDK.ts](</Users/fernando/GITS/gdc-workspace/old/gdc-sdk-client-ts/src/ClientSDK.ts:1>)
- [old/gdc-sdk-client-ts/src/interfaces/IProfile.ts](</Users/fernando/GITS/gdc-workspace/old/gdc-sdk-client-ts/src/interfaces/IProfile.ts:1>)
- [old/gdc-sdk-client-ts/src/interfaces/IVaultRepository.ts](</Users/fernando/GITS/gdc-workspace/old/gdc-sdk-client-ts/src/interfaces/IVaultRepository.ts:1>)
- [old/gdc-sdk-client-ts/src/interfaces/others.ts](</Users/fernando/GITS/gdc-workspace/old/gdc-sdk-client-ts/src/interfaces/others.ts:1>)

Relevant app/runtime references:

- [apptemplate-expo54-ts/context/JobContext.tsx](</Users/fernando/GITS/gdc-workspace/apptemplate-expo54-ts/context/JobContext.tsx:1>)
- [apptemplate-expo54-ts/docs/ARCHITECTURE.md](</Users/fernando/GITS/gdc-workspace/apptemplate-expo54-ts/docs/ARCHITECTURE.md:183>)
- [apptemplate-expo54-ts/docs/fapi-compliant-job-flow.md](</Users/fernando/GITS/gdc-workspace/apptemplate-expo54-ts/docs/fapi-compliant-job-flow.md:123>)

## What The Legacy Layer Mixed Together

The old package bundled several concerns in one place:

- shared job data models
- vault repository contracts
- actor profile/session state
- job orchestration and synchronization
- token sealing into pending jobs
- transport submission and polling
- actor capability materialization
- frontend runtime bootstrap

That was useful for early delivery, but it is too collapsed for the v2 split.

## V2 Ownership Map

### `gdc-common-utils-ts`

Own here:

- shared data models such as `JobRequest` and `JobStatus`
- shared `Editor`, `Reader`, `Builder`, and `State` classes
- high-level `get...` / `set...` methods on shared semantic classes
- shared crypto-neutral or runtime-neutral helpers used by job/profile layers

Do not own here:

- polling loops
- network submission
- profile loading from one runtime
- vault implementation details
- frontend or node session bootstrap

Current anchor already in place:

- [gdc-common-utils-ts/src/models/confidential-job.ts](</Users/fernando/GITS/gdc-workspace/gdc-common-utils-ts/src/models/confidential-job.ts:1>)

### `gdc-sdk-core-ts`

Own here:

- runtime-neutral contracts for actor profiles
- runtime-neutral contracts for profile loading
- runtime-neutral `JobManager` contract
- runtime-neutral vault/store contracts needed by profile/job orchestration
- actor-aware but runtime-neutral facades for controller, professional, member,
  and related role/sector families
- runtime-neutral contracts for index read/write and sync coordination

Do not own here:

- timer-driven polling implementation
- concrete secure storage, SQLite, IndexedDB, memory cache, Redis, Firestore
- browser `localStorage` or `SecureStore`
- node-only queue workers

### `gdc-sdk-node-ts`

Own here:

- server-side implementation of profile loading
- server-side implementation of `JobManager`
- transport submission/polling against current GW contracts
- node/server storage adapters
- actor-aware runtime orchestration in the name of a concrete actor

### `gdc-sdk-front-ts`

Own here:

- frontend implementation of profile loading
- frontend implementation of `JobManager`
- local vault/state adapters
- offline-first sync triggers
- actor-facing session/profile orchestration

## Legacy To V2 Mapping

### From `IProfile`

Legacy:

- local profile id
- role
- email
- did
- appType
- providerDid
- deviceDid
- status

V2 split:

- `sdk-core`
  - `ActorProfileDescriptor`
  - `ActorIdentityDescriptor`
  - `ActorCapabilityDescriptor`
- `sdk-front` / `sdk-node`
  - runtime-specific profile state hydration

### From `IVaultRepository`

Legacy:

- `initialize`
- `put`
- `get`
- `query`
- `delete`

V2 split:

- `sdk-core`
  - `ProfileStateStore`
  - `JobStore`
  - query contracts such as `ProfileStateQuery`
- `sdk-front` / `sdk-node`
  - actual adapter implementations

### From `IJobManager`

Legacy methods:

- `initialize`
- `shutdown`
- `setListener`
- `createJob`
- `findDraftJobByFormType`
- `createOrUpdateDraftJob`
- `sync`
- `queryJobs`
- `submitJob`
- `sealJobWithToken`
- `getJobResponseByThid`
- `generateId`

V2 split:

- `sdk-core`
  - `IJobManager`
  - `IJobDraftService`
  - `IJobSyncService`
  - `IJobResponseReader`
- `sdk-front` / `sdk-node`
  - concrete implementation and scheduling policy

### From `ProfileManager`

Legacy responsibilities:

- holds active profile
- owns `jobManager`
- owns `smartTokenManager`
- materializes actor service namespaces
- exposes semantic wrappers

V2 split:

- `sdk-core`
  - `ActorProfileRuntimeContract`
  - `LoadedActorProfile`
  - actor-scoped capability facades
- `sdk-front`
  - frontend profile runtime
- `sdk-node`
  - server-side profile runtime

### From `ClientSDK.initializeSession(...)`

Legacy responsibilities:

- trust bootstrap
- DID resolution
- profile id generation
- vault creation
- `ProfileManager` instantiation

V2 split:

- `sdk-core`
  - contract of `loadProfile...`
  - normalized input and output types
- `sdk-front`
  - frontend session bootstrap implementation
- `sdk-node`
  - backend/BFF/server bootstrap implementation

## First V2 Contracts To Introduce In `sdk-core`

The next implementation slice should introduce these runtime-neutral contracts.

### 1. `ActorProfileDescriptor`

Purpose:

- canonical identity and actor metadata
- no runtime storage or polling behavior

Suggested shape:

```ts
type ActorProfileDescriptor = {
  profileId: string;
  actorType: 'controller' | 'professional' | 'member' | 'related-person';
  roleCode?: string;
  email?: string;
  phone?: string;
  providerDid?: string;
  subjectDid?: string;
  deviceDid?: string;
  appClass?: 'frontend' | 'server';
};
```

### 2. `ProfileLoadRequest`

Purpose:

- normalized request for `loadProfile...`
- explicit actor, org, and subject context

Suggested direction:

```ts
type ProfileLoadRequest = {
  actorKind: ActorKind;
  providerDid: string;
  runtimeClass: 'frontend' | 'server';
  keyAccessMode: 'derive-from-seed' | 'unlock-encrypted-keys';
  actorRole?: string;
  email?: string;
  phone?: string;
  subjectDid?: string;
  profileId?: string;
  localPinPassword?: string;
};
```

This request is generic for any actor profile. It is not the same as a
subject-channel connection request.

### 3. `TrustedDeviceRegistrationRequest`

Purpose:

- register one device/runtime as trusted for one loaded profile
- keep bootstrap/OTP style secrets separate from local profile unlock secrets

### 4. `SubjectIndexConnectionRequest`

Purpose:

- connect one loaded actor profile to one subject index
- keep relationship/channel secrets separate from `localPinPassword`

Suggested direction:

```ts
type SubjectIndexConnectionRequest = {
  subjectId: string;
  userId: string;
  userRoleCode: string;
  secretKind: 'pin-password' | 'otp-code';
  connectionPinPassword?: string;
  otpCode?: string;
};
```

### 5. `SubjectIndexCompositionRequest`

Purpose:

- fetch the subject index composition after actor identity and index-channel
  access are already established

### 6. `IJobManager`

Purpose:

- runtime-neutral contract only
- no assumption about browser or node scheduler

Keep the semantic methods from the old contract, but move transport timing and
storage concerns into injected runtime adapters.

### 7. `LoadedActorProfile`

Purpose:

- return object from `loadProfile...`
- contains descriptor + capability surface + runtime services

Suggested direction:

```ts
type LoadedActorProfile = {
  descriptor: ActorProfileDescriptor;
  jobManager: IJobManager;
  capabilities: ActorCapabilityDescriptor[];
  facades: {
    controller?: unknown;
    professional?: unknown;
    member?: unknown;
  };
};
```

### 8. `ProfileSyncContract`

Purpose:

- offline/online synchronization contract
- bridge between pending local changes and remote index/service updates

This is where later app offline synchronization should connect to online index
service updates without baking frontend or node assumptions into the core
contract.

## Why This Matters For The Next Features

This split is the prerequisite for all of the following:

- `loadProfile` for one actor operating in the name of a subject/controller
- `registerTrustedDevice` for one loaded runtime/device
- `connectToSubjectIndex` for one actor/subject relationship
- fetching `Composition` or index projections through one actor-aware profile
- offline-first change capture in frontend runtime
- later synchronization from offline app state to online index service
- server-side actor execution using the same capability contracts

## Immediate Next Step

Implement the first `sdk-core` slice, not the full runtime:

1. add `ActorProfileDescriptor`
2. add `ProfileLoadRequest`
3. add `TrustedDeviceRegistrationRequest`
4. add `SubjectIndexConnectionRequest`
5. add `SubjectIndexCompositionRequest`
6. add v2 `IJobManager`
7. add `LoadedActorProfile`
8. add one high-level `101` contract test showing the separated shapes

Only after that should `sdk-front` and `sdk-node` each provide their own
runtime implementation.
