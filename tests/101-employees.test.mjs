// Employee 101: executable counterpart of `docs/101-EMPLOYEES.md`.
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BundleEditor,
  EmployeeDraft,
  buildEmployeeSearchBundle,
} from '../dist/index.js';
import {
  EmployeeBundleMethods,
  EmployeeBatchEntryTypes,
  EmployeeBundleRoutes,
  EmployeeBundleOperations,
  EmployeeClaimKeys,
  EmployeeSearchResourceType,
  ExampleEmployeeDirectory,
  createSharedProfessionalRoleComparisonInput,
} from './support/employee-test-fixtures.mjs';

test('101: employee draft and search semantics stay explicit', () => {
  const exactHistoricalSearch = buildEmployeeSearchBundle({
    claims: {
      [EmployeeClaimKeys.identifier]: ExampleEmployeeDirectory.doctorPurgedHistorical.identifier,
    },
  });

  assert.equal(exactHistoricalSearch.resourceType, EmployeeSearchResourceType.bundle);
  assert.equal(exactHistoricalSearch.type, EmployeeSearchResourceType.batch);
  assert.equal(exactHistoricalSearch.entry[0].request.method, EmployeeBundleMethods.search);
  assert.equal(exactHistoricalSearch.entry[0].request.url, EmployeeBundleRoutes.search);

  const sharedProfessionalRoleComparison = createSharedProfessionalRoleComparisonInput();
  const sameEmailDifferentRoles = [
    new EmployeeDraft()
      .setEmail(sharedProfessionalRoleComparison.sharedEmail)
      .setRole(sharedProfessionalRoleComparison.controllerRole)
      .toClaims(),
    new EmployeeDraft()
      .setEmail(sharedProfessionalRoleComparison.sharedEmail)
      .setRole(sharedProfessionalRoleComparison.doctorRole)
      .toClaims(),
  ];

  assert.equal(sameEmailDifferentRoles[0][EmployeeClaimKeys.email], sharedProfessionalRoleComparison.sharedEmail);
  assert.equal(sameEmailDifferentRoles[1][EmployeeClaimKeys.email], sharedProfessionalRoleComparison.sharedEmail);
  assert.notEqual(
    sameEmailDifferentRoles[0][EmployeeClaimKeys.role],
    sameEmailDifferentRoles[1][EmployeeClaimKeys.role],
  );

  const createBundleEditor = new BundleEditor()
    .setBundleOperation(EmployeeBundleOperations.create)
    .newEntry()
    .setEmail(ExampleEmployeeDirectory.doctorActive.email)
    .setRole(ExampleEmployeeDirectory.doctorActive.role);

  const generatedIdentifier = createBundleEditor.getIdentifier();
  assert.match(String(generatedIdentifier), /^urn:uuid:/);

  const createBatchBundle = createBundleEditor.doneEntry().build();
  assert.equal(createBatchBundle.resourceType, EmployeeSearchResourceType.bundle);
  assert.equal(createBatchBundle.type, EmployeeSearchResourceType.batch);
  assert.equal(createBatchBundle.entry[0].request.method, EmployeeBundleMethods.create);
  assert.equal(createBatchBundle.entry[0].resource.id, generatedIdentifier);
  assert.equal(createBatchBundle.entry[0].fullUrl, generatedIdentifier);
  assert.equal(
    createBatchBundle.entry[0].resource.meta.claims[EmployeeClaimKeys.identifier],
    generatedIdentifier,
  );

  const operationalSearchEditor = new BundleEditor()
    .setBundleOperation(EmployeeBundleOperations.search)
    .newEntry()
    .setEmail(ExampleEmployeeDirectory.doctorActive.email)
    .setRole(ExampleEmployeeDirectory.doctorActive.role);

  const operationalSearch = operationalSearchEditor.doneEntry().build();
  assert.equal(operationalSearch.entry[0].request.method, EmployeeBundleMethods.search);
  assert.equal(operationalSearch.entry[0].request.url, EmployeeBundleRoutes.search);

  const roleOnlySearch = new BundleEditor()
    .setBundleOperation(EmployeeBundleOperations.search)
    .newEntry()
    .setRole(sharedProfessionalRoleComparison.doctorRole)
    .doneEntry()
    .build();

  assert.deepEqual(roleOnlySearch.entry[0].resource, {
    resourceType: EmployeeSearchResourceType.parameters,
    parameter: [
      {
        name: EmployeeClaimKeys.role,
        valueString: sharedProfessionalRoleComparison.doctorRole,
      },
    ],
  });

  const allEmployeesSearch = new BundleEditor()
    .setBundleOperation(EmployeeBundleOperations.search)
    .newEntry()
    .doneEntry()
    .build();

  assert.deepEqual(allEmployeesSearch.entry[0].resource, {
    resourceType: EmployeeSearchResourceType.parameters,
    parameter: [],
  });

  const purgeBatchBundle = new BundleEditor()
    .setBundleOperation(EmployeeBundleOperations.purge)
    .newEntry(ExampleEmployeeDirectory.doctorPurgedHistorical.identifier)
    .doneEntry()
    .build();

  assert.equal(purgeBatchBundle.entry[0].request.method, EmployeeBundleMethods.purge);
  assert.equal(purgeBatchBundle.entry[0].type, EmployeeBatchEntryTypes.purge);
  assert.equal(
    purgeBatchBundle.entry[0].resource.meta.claims[EmployeeClaimKeys.identifier],
    ExampleEmployeeDirectory.doctorPurgedHistorical.identifier,
  );
});
