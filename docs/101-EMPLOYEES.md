# Employees 101

This is the canonical employee-contract note for the SDK family.

Teaching rule for this `101`:

- first show the highest-level editing surface a new frontend/backend developer
  can use safely
- only after that show the lower-level claims/builders layer
- do not start from raw claims maps or raw FHIR bundle internals unless the
  reader is already blocked by an advanced case

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

## Ownership Split

- `gdc-common-utils-ts`
  - constants
  - shared examples
  - `BundleEditor`
  - `BundleReader`
  - `BundleEntryEditor`
  - `EmployeeEntryEditor`
  - low-level FHIR search serializers
  - pure employee helper functions such as `buildEmployeeClaims(...)` and `buildEmployeeBatchEntry(...)`
- `gdc-sdk-core-ts`
  - `EmployeeDraft`
  - runtime-neutral orchestration and employee documentation
- `gdc-sdk-node-ts` and `gdc-sdk-front-ts`
  - reexport and execute the same core model in node/web/native runtimes
  - restrict the operational surface by actor/capability
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

Practical rule:

- `common-utils` = pure helpers and constants
- `sdk-core` = shared contracts and builders
- `sdk-node` / `sdk-front` = actor-scoped runtime surface

## Create

Start with the create flow first, on its own.

Start with the highest-level editor first.

- first choice for onboarding: `BundleEditor` + `EmployeeEntryEditor`
- second level: `EmployeeDraft`
- lower level: `BundleReader`, `buildEmployeeClaims(...)`, `buildEmployeeBatchEntry(...)`,
  `buildEmployeeSearchBundle(...)`

When teaching a new controller flow, prefer showing an explicit editor/session
object instead of jumping directly to raw claims maps.

Recommended example:

```ts
import { BundleEditor } from 'gdc-sdk-core-ts';
import {
  EXAMPLE_EMPLOYEE_DOCTOR_ACTIVE,
  EXAMPLE_PROVIDER_ORGANIZATION_DID,
} from 'gdc-common-utils-ts/examples';
import { ClaimsPersonSchemaorg } from 'gdc-common-utils-ts/constants/schemaorg';
import {
  EmployeeBundleOperations,
  EmployeeResourceTypes,
} from 'gdc-common-utils-ts/utils/employee';

const employeeEntry = new BundleEditor()
  .setBundleOperation(EmployeeBundleOperations.create)
  .setAllowedResourceType(EmployeeResourceTypes.employee)
  .newEntry()
  .asEmployee()
  .setEmail(EXAMPLE_EMPLOYEE_DOCTOR_ACTIVE.email)
  .setRole(EXAMPLE_EMPLOYEE_DOCTOR_ACTIVE.role)
  .addClaim(ClaimsPersonSchemaorg.memberOf, EXAMPLE_PROVIDER_ORGANIZATION_DID);

const generatedEmployeeIdentifier = employeeEntry.getIdentifier();
const createBatchBundle = employeeEntry.doneEntry().build();
```

Use this pattern when you want developers to understand create:

- one bundle has one declared business operation
- `setAllowedResourceType(...)` keeps this batch homogeneous
- `newEntry()` opens the active entry
- `asEmployee()` switches from generic entry editing to employee-specific editing
- if the entry needs an identifier and none was provided, it is generated
- generic claim editing and employee-specific setters both edit the active entry
- `doneEntry()` closes that entry in memory
- `build()` produces the final bundle to send to the backend

Alternative explicit-claim example:

```ts
import { BundleEditor } from 'gdc-sdk-core-ts';
import {
  EXAMPLE_EMPLOYEE_DOCTOR_ACTIVE,
  EXAMPLE_PROVIDER_ORGANIZATION_DID,
} from 'gdc-common-utils-ts/examples';
import { ClaimsPersonSchemaorg } from 'gdc-common-utils-ts/constants/schemaorg';
import {
  EmployeeBundleOperations,
  EmployeeResourceTypes,
} from 'gdc-common-utils-ts/utils/employee';

const employeeEntry = new BundleEditor()
  .setBundleOperation(EmployeeBundleOperations.create)
  .setAllowedResourceType(EmployeeResourceTypes.employee)
  .newEntry()
  .asEmployee()
  .setClaim(ClaimsPersonSchemaorg.email, EXAMPLE_EMPLOYEE_DOCTOR_ACTIVE.email)
  .setClaim(ClaimsPersonSchemaorg.hasOccupationalRoleValue, EXAMPLE_EMPLOYEE_DOCTOR_ACTIVE.role)
  .addClaim(ClaimsPersonSchemaorg.memberOf, EXAMPLE_PROVIDER_ORGANIZATION_DID);

console.log(employeeEntry.getClaim(ClaimsPersonSchemaorg.hasOccupationalRoleValue));

const createBatchBundle = employeeEntry.doneEntry().build();
```

Create several employees one by one in the same bundle:

```ts
import { BundleEditor } from 'gdc-sdk-core-ts';
import {
  EXAMPLE_EMPLOYEE_CONTROLLER_ACTIVE,
  EXAMPLE_EMPLOYEE_DOCTOR_ACTIVE,
} from 'gdc-common-utils-ts/examples';
import {
  EmployeeBundleOperations,
  EmployeeResourceTypes,
} from 'gdc-common-utils-ts/utils/employee';

const createManyEmployeesBatchBundle = new BundleEditor()
  .setBundleOperation(EmployeeBundleOperations.create)
  .setAllowedResourceType(EmployeeResourceTypes.employee)
  .newEntry(EXAMPLE_EMPLOYEE_CONTROLLER_ACTIVE.identifier)
  .asEmployee()
  .setEmail(EXAMPLE_EMPLOYEE_CONTROLLER_ACTIVE.email)
  .setRole(EXAMPLE_EMPLOYEE_CONTROLLER_ACTIVE.role)
  .doneEntry()
  .newEntry(EXAMPLE_EMPLOYEE_DOCTOR_ACTIVE.identifier)
  .asEmployee()
  .setEmail(EXAMPLE_EMPLOYEE_DOCTOR_ACTIVE.email)
  .setRole(EXAMPLE_EMPLOYEE_DOCTOR_ACTIVE.role)
  .doneEntry()
  .build();
```

## Search

Teach search as a second, separate step.

The same editor can produce the search bundle, but search should be explained
independently from create so the reader does not confuse the two operations.

Minimal search shape:

```ts
import { EmployeeBundleOperations } from 'gdc-common-utils-ts/utils/employee';

const employeeSearchBundle = new BundleEditor()
  .setBundleOperation(EmployeeBundleOperations.search)
  .setAllowedResourceType(EmployeeResourceTypes.employee)
  .newEntry()
  .asEmployee()
  .setEmail(EXAMPLE_EMPLOYEE_DOCTOR_ACTIVE.email)
  .setRole(EXAMPLE_EMPLOYEE_DOCTOR_ACTIVE.role)
  .doneEntry()
  .build();
```

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

Disable is a separate lifecycle operation.

Today the shared employee editor still produces the inner `_batch` entry with
`request.method = DELETE`.

```ts
import { EmployeeBundleOperations } from 'gdc-common-utils-ts/utils/employee';

const disableBatchBundle = new BundleEditor()
  .setBundleOperation(EmployeeBundleOperations.disable)
  .setAllowedResourceType(EmployeeResourceTypes.employee)
  .newEntry(EXAMPLE_EMPLOYEE_DOCTOR_ACTIVE.identifier)
  .asEmployee()
  .doneEntry()
  .build();
```

Current live contract:

- disable = `_batch` + inner `request.method = DELETE`
- this is still a soft delete / disable in business semantics
- it does not release the license

Preferred target contract:

- disable/enable should be state transitions via `PATCH`
- purge should remain a separate terminal operation

Conceptual `PATCH` example:

```ts
import { EmployeeBundleOperations } from 'gdc-common-utils-ts/utils/employee';

const disablePatchBatchBundle = new BundleEditor()
  .setBundleOperation(EmployeeBundleOperations.disable)
  .setAllowedResourceType(EmployeeResourceTypes.employee)
  .newEntry(EXAMPLE_EMPLOYEE_DOCTOR_ACTIVE.identifier)
  .asEmployee();
```

Disable several employees one by one:

```ts
import { EmployeeBundleOperations } from 'gdc-common-utils-ts/utils/employee';

const disableManyEmployeesBatchBundle = new BundleEditor()
  .setBundleOperation(EmployeeBundleOperations.disable)
  .setAllowedResourceType(EmployeeResourceTypes.employee)
  .newEntry(EXAMPLE_EMPLOYEE_CONTROLLER_ACTIVE.identifier)
  .asEmployee()
  .doneEntry()
  .newEntry(EXAMPLE_EMPLOYEE_DOCTOR_ACTIVE.identifier)
  .asEmployee()
  .doneEntry()
  .build();
```

## Purge

Purge is a separate lifecycle operation, but it should still be modeled as a
bundle operation in frontend and SDK code.

Runtime layers call the explicit `Employee/_purge` flow and identify the
employee by the canonical `identifier`. That is the only selector you normally
need for purge.

```ts
import { EmployeeBundleOperations } from 'gdc-common-utils-ts/utils/employee';

const purgeBatchBundle = new BundleEditor()
  .setBundleOperation(EmployeeBundleOperations.purge)
  .setAllowedResourceType(EmployeeResourceTypes.employee)
  .newEntry(EXAMPLE_EMPLOYEE_DOCTOR_ACTIVE.identifier)
  .asEmployee()
  .doneEntry()
  .build();
```

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

## Search Semantics

Employee search is a bundle operation. New SDK code should emit:

- outer route: `POST .../Employee/_search`
- inner bundle entry:
  - `request.method = POST`
  - `request.url = Employee/_search`
  - `resource.resourceType = Parameters`

Minimal FHIR bundle example:

```json
{
  "resourceType": "Bundle",
  "type": "batch",
  "entry": [
    {
      "request": {
        "method": "POST",
        "url": "Employee/_search"
      },
      "resource": {
        "resourceType": "Parameters",
        "parameter": [
          {
            "name": "org.schema.Person.email",
            "valueString": "employee.two@example.org"
          }
        ]
      }
    }
  ]
}
```

Meaning of the main search keys:

- `org.schema.Person.identifier`
  - targets one technical employee profile
  - useful for audit/history
  - still resolves a profile that was previously purged
- `org.schema.Person.email`
  - targets the functional person mailbox
  - can return more than one active employee if that email has more than one role
- `org.schema.Person.email` + `org.schema.Person.hasOccupation.identifier.value`
  - targets one functional employee role
  - recommended exact operational lookup

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

- `identifier` when you need one specific historical or technical profile
- `email` when you want to list employee roles for one person
- `email + role` when you want the operational employee record
