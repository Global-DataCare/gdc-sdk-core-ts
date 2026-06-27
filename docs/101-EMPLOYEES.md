# Employees 101

This is the canonical employee-contract note for the SDK family.

This `101` is the canonical functional note for employee semantics in
`sdk-core`.

The editor-level mechanics live in `common-utils`:

- [gdc-common-utils-ts/docs/101-EMPLOYEE_ENTRY_EDITOR.md](https://github.com/Global-DataCare/gdc-common-utils-ts/blob/main/docs/101-EMPLOYEE_ENTRY_EDITOR.md)
- [gdc-common-utils-ts/docs/101-BUNDLE_EDITOR_READER.md](https://github.com/Global-DataCare/gdc-common-utils-ts/blob/main/docs/101-BUNDLE_EDITOR_READER.md)

Read this in `sdk-core` first, then read the runtime guide of the SDK you are
using:

- [gdc-sdk-node-ts/docs/101-SDK_INTEGRATION.md](https://github.com/Global-DataCare/gdc-sdk-node-ts/blob/main/docs/101-SDK_INTEGRATION.md)
- [gdc-sdk-node-ts/docs/101-LIVE_GW_LOCAL.md](https://github.com/Global-DataCare/gdc-sdk-node-ts/blob/main/docs/101-LIVE_GW_LOCAL.md)
- [gdc-sdk-front-ts/docs/101-SDK_INTEGRATION.md](https://github.com/Global-DataCare/gdc-sdk-front-ts/blob/main/docs/101-SDK_INTEGRATION.md)

For the shortest executable reference, open:

- [gdc-sdk-core-ts/tests/101-employees.test.mjs](https://github.com/Global-DataCare/gdc-sdk-core-ts/blob/main/tests/101-employees.test.mjs)

That `101` stays intentionally small. Broader coverage lives in:

- [gdc-sdk-core-ts/tests/employee-draft.test.mjs](https://github.com/Global-DataCare/gdc-sdk-core-ts/blob/main/tests/employee-draft.test.mjs)
- [gwtemplate-node-ts/src/__tests__/unit/managers/EmployeeManager.test.ts](https://github.com/Global-DataCare/gwtemplate-node-ts/blob/main/src/__tests__/unit/managers/EmployeeManager.test.ts)
- [gwtemplate-node-ts/src/__tests__/integration/employeeApi.test.ts](https://github.com/Global-DataCare/gwtemplate-node-ts/blob/main/src/__tests__/integration/employeeApi.test.ts)

## Package Split

- `gdc-common-utils-ts`
  - owns `BundleEditor`, `BundleReader`, `BundleEntryEditor`, and `EmployeeEntryEditor`
  - owns editor-level tests and examples
  - owns employee bundle construction mechanics
- `gdc-sdk-core-ts`
  - `EmployeeDraft`
  - runtime-neutral employee semantics and documentation
- `gdc-sdk-node-ts` and `gdc-sdk-front-ts`
  - runtime execution
  - actor-scoped surface
- `gwtemplate-node-ts`
  - validates and processes the submitted bundles

## Actor Ownership

Employee management belongs to the organization controller surface.

- `gdc-sdk-core-ts`
  - models employee claims, bundle entries, lifecycle semantics, and capability vocabulary
  - does not decide which runtime actor is allowed to call create/search/disable/purge
- `gdc-sdk-node-ts`
  - should expose employee management through `OrganizationControllerSdk`
  - capability guards belong in the node runtime facade/session layer
- `gdc-sdk-front-ts`
  - should expose employee management through `orgAdmin`
  - capability-to-service mapping belongs in the frontend session/profile layer

Practical rule in this repo:

- `common-utils` = bundle mechanics and resource editors
- `sdk-core` = employee semantics and shared contracts
- `sdk-node` / `sdk-front` = actor-scoped runtime surface

## Editor Mechanics

Do not teach bundle construction details from this document.

Use these instead:

- [gdc-common-utils-ts/docs/101-EMPLOYEE_ENTRY_EDITOR.md](https://github.com/Global-DataCare/gdc-common-utils-ts/blob/main/docs/101-EMPLOYEE_ENTRY_EDITOR.md)
- [gdc-common-utils-ts/__tests__/101-employee-examples.test.ts](https://github.com/Global-DataCare/gdc-common-utils-ts/blob/main/__tests__/101-employee-examples.test.ts)

That is where the canonical explanation lives for:

- `BundleEditor`
- `BundleEntryEditor`
- `EmployeeEntryEditor`
- `build()`
- `doneEntry()`
- employee create/search/disable/purge bundle shaping

## Search

Operational search rules:

- `email + role`
  - recommended exact operational lookup
- `email`
  - returns all active employee profiles for that mailbox
- `role`
  - returns all active employee profiles for that role
- no filters
  - returns all employees
- `identifier`
  - targets one exact technical or historical profile

## Disable

Current live contract:

- disable = `_batch` + inner `request.method = DELETE`
- this is still a soft delete / disable in business semantics
- it does not release the license

Preferred target contract:

- disable/enable should be state transitions via `PATCH`
- purge should remain a separate terminal operation

## Purge

Purge is a separate lifecycle operation, but it should still be modeled as a
bundle operation in frontend and SDK code.

Runtime layers call the explicit `Employee/_purge` flow and identify the
employee by one concrete profile row. In practice, prefer the current
`resource.id` returned by create/search as the operational target, while
keeping the canonical `identifier` as the exportable/interoperable identity
value carried in claims.

Only after that should you explain the lower-level building blocks:

- `EmployeeDraft`
  - for authoring canonical employee claims only
- `buildEmployeeBatchEntry(...)`
  - for shaping one employee batch entry
- `buildEmployeeBatchBundle(...)`
  - for shaping a canonical employee `_batch` bundle
- `buildEmployeeSearchBundle(...)`
  - for shaping the canonical `POST + Parameters` employee search bundle
- `buildEmployeePurgeBundle(...)`
  - for shaping the canonical one-entry employee purge bundle routed later to
    `Employee/_purge`

## Lifecycle

Teach lifecycle only after create and search are already clear.

## Lifecycle Semantics

- `create`
  - creates or reuses according to lifecycle rules
- `disable`
  - soft delete
  - inactivates the employee
  - does not release the license
- `purge`
  - requires the employee to be disabled first
  - releases the license
  - keeps the old profile as historical identity

Current lifecycle model is:

- create after `disable`
  - may reactivate the same employee profile
- create after `purge`
  - creates a new technical identity
  - new UUID / identifier
  - historical profile remains addressable by its old identifier

## Practical Rule

Use:

- `resourceId`
  - when you need the current technical GW profile row for disable or purge
  - this should stay one `urn:uuid:*` internal id
- `identifier` when you need one specific historical or technical profile
- `email` when you want to list employee roles for one person
- `email + role` when you want the operational employee record
