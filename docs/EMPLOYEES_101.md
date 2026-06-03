# Employees 101

This is the canonical employee-contract note for the SDK family.

Read this in `sdk-core` first, then read the runtime guide of the SDK you are
using:

- [gdc-sdk-node-ts/docs/SDK_INTEGRATION_101.md](https://github.com/Global-DataCare/gdc-sdk-node-ts/blob/main/docs/SDK_INTEGRATION_101.md)
- [gdc-sdk-front-ts/docs/SDK_INTEGRATION_101.md](https://github.com/Global-DataCare/gdc-sdk-front-ts/blob/main/docs/SDK_INTEGRATION_101.md)

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
  - low-level FHIR search serializers
  - pure employee helper functions such as `buildEmployeeClaims(...)` and `buildEmployeeBatchEntry(...)`
- `gdc-sdk-core-ts`
  - `EmployeeDraft`
  - runtime-neutral orchestration and higher-level builders
- `gdc-sdk-node-ts` and `gdc-sdk-front-ts`
  - reexport and execute the same core model in node/web/native runtimes
- `gwtemplate-node-ts`
  - validates and processes the submitted bundles

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
