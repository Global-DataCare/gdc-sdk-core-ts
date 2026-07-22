# Contributing

Read [ARCHITECTURE.md](./ARCHITECTURE.md) before adding or renaming facades.

## Main Rule

`gdc-sdk-core-ts` owns runtime-neutral domain facades and actor/profile
capability contracts.

Before adding a new high-level helper here, verify whether it belongs in
`gdc-common-utils-ts` instead.

Role/sector-oriented facades are allowed here only when they remain
runtime-neutral and describe capabilities rather than concrete execution
adapters.

Do not add first-class `get...` / `set...` methods here for shared semantic
classes when those methods belong in `gdc-common-utils-ts`.

`sdk-core` is also where runtime-neutral profile/runtime contracts belong, for
example:

- `loadProfile(...)` / `closeProfile(...)` request-response contracts
- `JobManager` contracts
- logical outbox contracts
- logical queue contracts
- vault port contracts

Do not implement concrete runtime adapters here such as:

- `createJobManagerInMemory(...)`
- `VaultMemory`
- `VaultSqlite`
- backend/frontend queue workers

## Naming Rule

- keep operation prefixes first
- do not mix `new...` and `create...` for the same family
- do not use CRUD-looking `create...` names for non-create operations
- prefer names such as `prepareSearch...` and `prepareLifecycle...`
- when specializing one common runtime concept, keep the common concept first
  and the specialization later, e.g. `createJobManagerInMemory(...)`
- when specializing a concrete class or store, keep the shared concept as the
  full prefix and append the specialization suffix, e.g.:
  - `UserProfileIndexStoreInMemory`
  - `UserProfileIndexStoreFirestore`
  - `UserProfileVaultSecureStorage`
  - `UserProfileVaultFirestore`
- do not invert the order into names such as:
  - `FirestoreUserProfileIndexStore`
  - `SecureStorageUserProfileVault`
  - `InMemoryJobManager`
- the programming rule is:
  - common concept first for autocomplete/discoverability
  - specialization last for implementation choice

## Test Rule

Facade tests should stay step by step and high-level, reusing examples from
`gdc-common-utils-ts` instead of duplicating literals when possible.

Use the same header block at the top of every test file, immediately below the
copyright line, so the test intent is visible before the imports:

- `101 note` or `Teaching goal` comment block
- one-sentence contract summary
- reused shared fixtures/examples
- positive path and at least one negative/validation path
- compatibility path when legacy aliases or fallback behavior exist
- no ad hoc literals when shared fixtures exist
- helper functions stay in dedicated helper modules, not beside the class

TDD rule:

1. add or update the failing test first
2. implement the minimum change to pass
3. add the compatibility case if the API supports legacy inputs
4. refactor without changing behavior
# Contract literals and reusable evidence

- Do not repeat protocol, domain, claim, status, priority, media-type,
  cryptographic-profile or operation-kind string literals in consumers.
  Export one typed constant and its derived union from the package that owns
  the contract.
- Tests must reuse exported examples/fixtures from the owning common or
  product-core package when the value represents a shared contract. A test may
  keep a local literal only when that value is deliberately unique to the
  scenario and is not production vocabulary.
- Keep contracts/interfaces, implementations/classes and pure builders or
  projectors in separate modules. Public barrels may compose those modules;
  product adapters must not duplicate them.
- A behavior change is incomplete until a test proves consumers use the
  exported contract and collision/unknown-value paths fail explicitly.
