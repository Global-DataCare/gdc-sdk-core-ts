// Employee 101: executable counterpart of `docs/101-EMPLOYEES.md`.
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  EmployeeBundleSession,
  EmployeeDraft,
  buildEmployeeSearchBundle,
} from '../dist/index.js';
import {
  EmployeeBundleMethods,
  EmployeeBundleRoutes,
  EmployeeClaimKeys,
  EmployeeSearchResourceType,
  ExampleEmployeeDirectory,
  createDoctorRoleBundleEditorInput,
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
  assert.deepEqual(exactHistoricalSearch.entry[0].resource, {
    resourceType: EmployeeSearchResourceType.parameters,
    parameter: [
      {
        name: EmployeeClaimKeys.identifier,
        valueString: ExampleEmployeeDirectory.doctorPurgedHistorical.identifier,
      },
    ],
  });

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

  const controllerFlowBundleEditorInput = createDoctorRoleBundleEditorInput();
  const controllerBundleEditor = new EmployeeBundleSession()
    .setIdentifier(controllerFlowBundleEditorInput.identifier)
    .setEmail(controllerFlowBundleEditorInput.email)
    .setRole(controllerFlowBundleEditorInput.role);

  assert.equal(
    controllerBundleEditor.getClaim(EmployeeClaimKeys.identifier),
    controllerFlowBundleEditorInput.identifier,
  );

  const createBatchBundle = controllerBundleEditor.toBundleBatch({
    method: EmployeeBundleMethods.create,
    resourceId: ExampleEmployeeDirectory.doctorActive.identifier,
  });
  assert.equal(createBatchBundle.resourceType, EmployeeSearchResourceType.bundle);
  assert.equal(createBatchBundle.type, EmployeeSearchResourceType.batch);
  assert.equal(createBatchBundle.entry[0].request.method, EmployeeBundleMethods.create);
  assert.equal(createBatchBundle.entry[0].resource.id, ExampleEmployeeDirectory.doctorActive.identifier);

  const operationalSearch = new EmployeeBundleSession()
    .setEmail(controllerFlowBundleEditorInput.email)
    .setRole(controllerFlowBundleEditorInput.role)
    .toBundleSearch();

  assert.equal(operationalSearch.entry[0].request.method, EmployeeBundleMethods.search);
  assert.equal(operationalSearch.entry[0].request.url, EmployeeBundleRoutes.search);
  assert.deepEqual(operationalSearch.entry[0].resource, {
    resourceType: EmployeeSearchResourceType.parameters,
    parameter: [
      {
        name: EmployeeClaimKeys.email,
        valueString: controllerFlowBundleEditorInput.email,
      },
      {
        name: EmployeeClaimKeys.role,
        valueString: controllerFlowBundleEditorInput.role,
      },
    ],
  });

  const roleOnlySearch = new EmployeeBundleSession()
    .setRole(sharedProfessionalRoleComparison.doctorRole)
    .toBundleSearch();

  assert.deepEqual(roleOnlySearch.entry[0].resource, {
    resourceType: EmployeeSearchResourceType.parameters,
    parameter: [
      {
        name: EmployeeClaimKeys.role,
        valueString: sharedProfessionalRoleComparison.doctorRole,
      },
    ],
  });

  const allEmployeesSearch = new EmployeeBundleSession().toBundleSearch();
  assert.deepEqual(allEmployeesSearch.entry[0].resource, {
    resourceType: EmployeeSearchResourceType.parameters,
    parameter: [],
  });
});
