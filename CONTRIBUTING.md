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

## Test Rule

Facade tests should stay step by step and high-level, reusing examples from
`gdc-common-utils-ts` instead of duplicating literals when possible.
