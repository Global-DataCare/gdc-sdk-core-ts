// Employee 101: see `docs/101-EMPLOYEES.md` and `tests/support/employee-test-fixtures.mjs`.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ClaimsPersonSchemaorg } from 'gdc-common-utils-ts/constants/schemaorg';

import {
  EmployeeBundleSession,
  EmployeeDraft,
  buildEmployeeBatchBundle,
  buildEmployeeBatchEntry,
  buildEmployeeClaims,
  buildEmployeeSearchBundle,
  buildSearchBundle,
} from '../dist/index.js';
import {
  EmployeeBatchEntryTypes,
  EmployeeBundleMethods,
  EmployeeBundleRoutes,
  EmployeeClaimKeys,
  EmployeeSearchResourceType,
  ExampleEmployeeDirectory,
  ExampleEmployeeOrganization,
  createDoctorRoleBundleEditorInput,
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

test('EmployeeBundleSession supports explicit claim editing and derived create/search payloads', () => {
  const bundleEditorInput = createDoctorRoleBundleEditorInput();
  const bundleEditor = new EmployeeBundleSession()
    .setClaim(EmployeeClaimKeys.identifier, bundleEditorInput.identifier)
    .setEmail(bundleEditorInput.email)
    .setRole(bundleEditorInput.role)
    .addClaim(EmployeeClaimKeys.memberOf, bundleEditorInput.memberOf[0])
    .addClaim(EmployeeClaimKeys.memberOf, bundleEditorInput.memberOf[1]);

  assert.equal(bundleEditor.getClaim(EmployeeClaimKeys.email), bundleEditorInput.email);
  assert.equal(bundleEditor.hasClaim(EmployeeClaimKeys.identifier), true);
  assert.deepEqual(bundleEditor.getClaim(EmployeeClaimKeys.memberOf), bundleEditorInput.memberOf);

  const entry = bundleEditor.toBundleEntry({
    method: EmployeeBundleMethods.create,
    resourceId: ExampleEmployeeDirectory.doctorActive.identifier,
  });
  assert.equal(entry.type, EmployeeBatchEntryTypes.create);
  assert.equal(entry.request.method, EmployeeBundleMethods.create);
  assert.equal(entry.resource.id, ExampleEmployeeDirectory.doctorActive.identifier);
  assert.deepEqual(entry.resource.meta.claims[EmployeeClaimKeys.memberOf], bundleEditorInput.memberOf);

  const batchBundle = bundleEditor.toBundleBatch({
    method: EmployeeBundleMethods.create,
    resourceId: ExampleEmployeeDirectory.doctorActive.identifier,
  });
  assert.equal(batchBundle.resourceType, EmployeeSearchResourceType.bundle);
  assert.equal(batchBundle.type, EmployeeSearchResourceType.batch);
  assert.equal(batchBundle.entry[0].request.method, EmployeeBundleMethods.create);
  assert.equal(batchBundle.entry[0].resource.id, ExampleEmployeeDirectory.doctorActive.identifier);

  const searchBundle = bundleEditor.toBundleSearch();
  assert.equal(searchBundle.resourceType, EmployeeSearchResourceType.bundle);
  assert.equal(searchBundle.type, EmployeeSearchResourceType.batch);
  assert.equal(searchBundle.entry[0].request.method, EmployeeBundleMethods.search);
  assert.equal(searchBundle.entry[0].request.url, EmployeeBundleRoutes.search);
  assert.ok(Array.isArray(searchBundle.entry[0].resource.parameter));
  assert.equal(
    searchBundle.entry[0].resource.parameter.some((item) => item.name === EmployeeClaimKeys.context),
    false,
  );
});

test('buildEmployeeClaims merges additional claims and canonical setters', () => {
  const claims = buildEmployeeClaims({
    email: ExampleEmployeeDirectory.doctorActive.email,
    role: ExampleEmployeeDirectory.doctorActive.role,
    additionalClaims: {
      [EmployeeClaimKeys.context]: 'org.schema',
      [ClaimsPersonSchemaorg.worksFor]: ExampleEmployeeDirectory.doctorActive.identifier,
    },
  });

  assert.equal(claims[EmployeeClaimKeys.email], ExampleEmployeeDirectory.doctorActive.email);
  assert.equal(claims[EmployeeClaimKeys.role], ExampleEmployeeDirectory.doctorActive.role);
  assert.equal(claims[ClaimsPersonSchemaorg.worksFor], ExampleEmployeeDirectory.doctorActive.identifier);
});

test('buildEmployeeBatchEntry builds a claims-first Employee entry', () => {
  const entry = buildEmployeeBatchEntry({
    method: EmployeeBundleMethods.create,
    resourceId: ExampleEmployeeDirectory.controllerActive.identifier,
    claims: buildEmployeeClaims({
      email: ExampleEmployeeDirectory.controllerActive.email,
      role: ExampleEmployeeDirectory.controllerActive.role,
    }),
  });

  assert.equal(entry.type, EmployeeBatchEntryTypes.create);
  assert.equal(entry.request.method, EmployeeBundleMethods.create);
  assert.equal(entry.resource.resourceType, EmployeeSearchResourceType.employee);
  assert.equal(entry.resource.id, ExampleEmployeeDirectory.controllerActive.identifier);
  assert.equal(entry.resource.meta.claims[EmployeeClaimKeys.email], ExampleEmployeeDirectory.controllerActive.email);
});

test('buildEmployeeBatchBundle wraps employee batch entries into one batch bundle', () => {
  const bundle = buildEmployeeBatchBundle({
    entries: [
      {
        method: EmployeeBundleMethods.create,
        resourceId: ExampleEmployeeDirectory.controllerActive.identifier,
        claims: buildEmployeeClaims({
          email: ExampleEmployeeDirectory.controllerActive.email,
          role: ExampleEmployeeDirectory.controllerActive.role,
        }),
      },
    ],
  });

  assert.equal(bundle.resourceType, EmployeeSearchResourceType.bundle);
  assert.equal(bundle.type, EmployeeSearchResourceType.batch);
  assert.equal(bundle.entry[0].request.method, EmployeeBundleMethods.create);
  assert.equal(bundle.entry[0].resource.id, ExampleEmployeeDirectory.controllerActive.identifier);
});

test('employee search helpers build canonical batch POST bundles by default', () => {
  const bundle = buildEmployeeSearchBundle({
    claims: {
      [EmployeeClaimKeys.email]: ExampleEmployeeDirectory.controllerActive.email,
    },
  });
  assert.equal(bundle.resourceType, EmployeeSearchResourceType.bundle);
  assert.equal(bundle.type, EmployeeSearchResourceType.batch);
  assert.equal(bundle.entry[0].request.method, EmployeeBundleMethods.search);
  assert.equal(bundle.entry[0].request.url, EmployeeBundleRoutes.search);
  assert.deepEqual(bundle.entry[0].resource, {
    resourceType: EmployeeSearchResourceType.parameters,
    parameter: [
      { name: EmployeeClaimKeys.email, valueString: ExampleEmployeeDirectory.controllerActive.email },
    ],
  });
});

test('employee search helpers support email plus role, role-only, and empty searches', () => {
  const emailAndRoleBundle = buildEmployeeSearchBundle({
    claims: {
      [EmployeeClaimKeys.email]: ExampleEmployeeDirectory.doctorActive.email,
      [EmployeeClaimKeys.role]: ExampleEmployeeDirectory.doctorActive.role,
      [EmployeeClaimKeys.context]: 'org.schema',
    },
  });
  assert.deepEqual(emailAndRoleBundle.entry[0].resource, {
    resourceType: EmployeeSearchResourceType.parameters,
    parameter: [
      { name: EmployeeClaimKeys.email, valueString: ExampleEmployeeDirectory.doctorActive.email },
      { name: EmployeeClaimKeys.role, valueString: ExampleEmployeeDirectory.doctorActive.role },
    ],
  });

  const roleOnlyBundle = buildEmployeeSearchBundle({
    claims: {
      [EmployeeClaimKeys.role]: ExampleEmployeeDirectory.doctorActive.role,
    },
  });
  assert.deepEqual(roleOnlyBundle.entry[0].resource, {
    resourceType: EmployeeSearchResourceType.parameters,
    parameter: [
      { name: EmployeeClaimKeys.role, valueString: ExampleEmployeeDirectory.doctorActive.role },
    ],
  });

  const allEmployeesBundle = buildEmployeeSearchBundle();
  assert.deepEqual(allEmployeesBundle.entry[0].resource, {
    resourceType: EmployeeSearchResourceType.parameters,
    parameter: [],
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
  assert.equal(
    bundle.entry[0].request.url,
    'Employee?org.schema.Person.email=shared.professional%40example.org',
  );
});
