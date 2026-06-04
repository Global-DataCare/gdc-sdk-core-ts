// Employee draft coverage for `sdk-core`.
//
// Builder/editor logic belongs in `gdc-common-utils-ts`.
// This file only covers the runtime-neutral `EmployeeDraft` surface and the
// small `sdk-core` search wrapper behavior that remains in this package.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ClaimsPersonSchemaorg } from 'gdc-common-utils-ts/constants/schemaorg';

import {
  EmployeeDraft,
  buildEmployeeSearchBundle,
  buildSearchBundle,
} from '../dist/index.js';
import {
  EmployeeBundleMethods,
  EmployeeBundleRoutes,
  EmployeeClaimKeys,
  EmployeeSearchResourceType,
  ExampleEmployeeDirectory,
  ExampleEmployeeOrganization,
  createSharedProfessionalRoleComparisonInput,
} from './support/employee-test-fixtures.mjs';

test('EmployeeDraft builds canonical employee claims', () => {
  const claims = new EmployeeDraft()
    .setIdentifier(ExampleEmployeeDirectory.controllerActive.identifier)
    .setEmail(ExampleEmployeeDirectory.controllerActive.email)
    .setRole(ExampleEmployeeDirectory.controllerActive.role)
    .setMemberOfOrgTaxId(ExampleEmployeeOrganization.taxId)
    .toClaims();

  assert.equal(claims[EmployeeClaimKeys.context], 'org.schema');
  assert.equal(claims[EmployeeClaimKeys.identifier], ExampleEmployeeDirectory.controllerActive.identifier);
  assert.equal(claims[EmployeeClaimKeys.email], ExampleEmployeeDirectory.controllerActive.email);
  assert.equal(claims[EmployeeClaimKeys.role], ExampleEmployeeDirectory.controllerActive.role);
  assert.equal(claims[EmployeeClaimKeys.memberOfOrgTaxId], ExampleEmployeeOrganization.taxId);
});

test('EmployeeDraft normalizes missing identifiers and can generate one on demand', () => {
  const draft = new EmployeeDraft()
    .setIdentifier('')
    .setEmail(ExampleEmployeeDirectory.controllerActive.email);

  assert.equal(draft.getEmployeeIdentifier(), undefined);

  const generatedIdentifier = draft.ensureEmployeeIdentifier();
  assert.match(generatedIdentifier, /^urn:uuid:/);
  assert.equal(draft.getEmployeeIdentifier(), generatedIdentifier);
});

test('EmployeeDraft keeps same-email different-role scenarios explicit', () => {
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
});

test('sdk-core employee search wrapper builds canonical batch POST bundles by default', () => {
  const bundle = buildEmployeeSearchBundle({
    claims: {
      [EmployeeClaimKeys.email]: ExampleEmployeeDirectory.controllerActive.email,
    },
  });

  assert.equal(bundle.entry[0].request.method, EmployeeBundleMethods.search);
  assert.equal(bundle.entry[0].request.url, EmployeeBundleRoutes.search);
});

test('sdk-core employee search wrapper strips @context from search Parameters payloads', () => {
  const bundle = buildEmployeeSearchBundle({
    claims: {
      [EmployeeClaimKeys.email]: ExampleEmployeeDirectory.doctorActive.email,
      [EmployeeClaimKeys.role]: ExampleEmployeeDirectory.doctorActive.role,
      [EmployeeClaimKeys.context]: 'org.schema',
    },
  });

  assert.deepEqual(bundle.entry[0].resource, {
    resourceType: EmployeeSearchResourceType.parameters,
    parameter: [
      { name: EmployeeClaimKeys.email, valueString: ExampleEmployeeDirectory.doctorActive.email },
      { name: EmployeeClaimKeys.role, valueString: ExampleEmployeeDirectory.doctorActive.role },
    ],
  });
});

test('generic search bundles still support legacy GET query encoding', () => {
  const bundle = buildSearchBundle({
    resourceType: EmployeeSearchResourceType.employee,
    encoding: 'get-query',
    searchParams: {
      [EmployeeClaimKeys.email]: ExampleEmployeeDirectory.controllerActive.email,
    },
  });

  assert.equal(bundle.entry[0].request.method, 'GET');
});
