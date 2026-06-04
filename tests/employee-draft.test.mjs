// Employee 101: see `docs/101-EMPLOYEES.md` and `tests/support/employee-test-fixtures.mjs`.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ClaimsPersonSchemaorg } from 'gdc-common-utils-ts/constants/schemaorg';

import {
  BundleEditor,
  EmployeeDraft,
  buildEmployeeBatchBundle,
  buildEmployeeBatchBundleFromEntries,
  buildEmployeeBatchEntry,
  buildEmployeeClaims,
  buildEmployeePurgeBundle,
  buildEmployeeSearchBundle,
  buildSearchBundle,
} from '../dist/index.js';
import {
  EmployeeBatchEntryTypes,
  EmployeeBundleMethods,
  EmployeeBundleOperations,
  EmployeeBundleRoutes,
  EmployeeClaimKeys,
  EmployeeResourceTypes,
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

test('BundleEditor keeps generic claim editing separate from employee-specific helper methods', () => {
  const sharedProfessionalRoleComparison = createSharedProfessionalRoleComparisonInput();
  const bundleEntryEditor = new BundleEditor()
    .setBundleOperation(EmployeeBundleOperations.search)
    .setAllowedResourceType(EmployeeResourceTypes.employee)
    .newEntry()
    .setClaim(EmployeeClaimKeys.email, sharedProfessionalRoleComparison.sharedEmail)
    .setClaim(EmployeeClaimKeys.role, sharedProfessionalRoleComparison.doctorRole);

  assert.equal(bundleEntryEditor.getClaim(EmployeeClaimKeys.email), sharedProfessionalRoleComparison.sharedEmail);
  assert.equal(bundleEntryEditor.getClaim(EmployeeClaimKeys.role), sharedProfessionalRoleComparison.doctorRole);
});

test('Employee entry adapters keep one active employee entry and build bundles by operation', () => {
  const bundleEditor = new BundleEditor()
    .setBundleOperation(EmployeeBundleOperations.create)
    .setAllowedResourceType(EmployeeResourceTypes.employee)
    .newEntry()
    .asEmployee()
    .setEmail(ExampleEmployeeDirectory.doctorActive.email)
    .setRole(ExampleEmployeeDirectory.doctorActive.role)
    .addClaim(EmployeeClaimKeys.memberOf, ExampleEmployeeDirectory.doctorActive.identifier);

  const generatedIdentifier = bundleEditor.getIdentifier();
  assert.match(String(generatedIdentifier), /^urn:uuid:/);
  assert.equal(bundleEditor.getFullUrl(), generatedIdentifier);
  assert.equal(bundleEditor.getClaim(EmployeeClaimKeys.email), ExampleEmployeeDirectory.doctorActive.email);

  const createBundle = bundleEditor.doneEntry().build();
  assert.equal(createBundle.resourceType, EmployeeSearchResourceType.bundle);
  assert.equal(createBundle.type, EmployeeSearchResourceType.batch);
  assert.equal(createBundle.entry[0].request.method, EmployeeBundleMethods.create);
  assert.equal(createBundle.entry[0].resource.id, generatedIdentifier);
  assert.equal(createBundle.entry[0].fullUrl, generatedIdentifier);
});

test('Employee entry adapters support direct identifier and fullUrl edits on the active entry', () => {
  const sharedProfessionalRoleComparison = createSharedProfessionalRoleComparisonInput();
  const bundleEditor = new BundleEditor()
    .setBundleOperation(EmployeeBundleOperations.create)
    .setAllowedResourceType(EmployeeResourceTypes.employee)
    .newEntry()
    .asEmployee()
    .setIdentifier(ExampleEmployeeDirectory.doctorPurgedHistorical.identifier)
    .setEmail(sharedProfessionalRoleComparison.sharedEmail)
    .setRole(sharedProfessionalRoleComparison.doctorRole);

  assert.equal(bundleEditor.getIdentifier(), ExampleEmployeeDirectory.doctorPurgedHistorical.identifier);
  assert.equal(bundleEditor.getFullUrl(), ExampleEmployeeDirectory.doctorPurgedHistorical.identifier);

  bundleEditor.setFullUrl(ExampleEmployeeDirectory.controllerActive.identifier);
  assert.equal(bundleEditor.getFullUrl(), ExampleEmployeeDirectory.controllerActive.identifier);
});

test('Employee entry adapters can build several employee create entries in one batch bundle', () => {
  const createBundleEditor = new BundleEditor()
    .setBundleOperation(EmployeeBundleOperations.create)
    .setAllowedResourceType(EmployeeResourceTypes.employee);

  createBundleEditor
    .newEntry(ExampleEmployeeDirectory.controllerActive.identifier)
    .asEmployee()
    .setEmail(ExampleEmployeeDirectory.controllerActive.email)
    .setRole(ExampleEmployeeDirectory.controllerActive.role)
    .doneEntry()
    .newEntry(ExampleEmployeeDirectory.doctorActive.identifier)
    .asEmployee()
    .setEmail(ExampleEmployeeDirectory.doctorActive.email)
    .setRole(ExampleEmployeeDirectory.doctorActive.role)
    .doneEntry();

  const bundle = createBundleEditor.build();
  assert.equal(bundle.resourceType, EmployeeSearchResourceType.bundle);
  assert.equal(bundle.type, EmployeeSearchResourceType.batch);
  assert.equal(bundle.entry.length, 2);
  assert.equal(bundle.entry[0].resource.id, ExampleEmployeeDirectory.controllerActive.identifier);
  assert.equal(bundle.entry[1].resource.id, ExampleEmployeeDirectory.doctorActive.identifier);
});

test('Employee entry adapters can build disable and purge bundles with the same editor API', () => {
  const disableBundle = new BundleEditor()
    .setBundleOperation(EmployeeBundleOperations.disable)
    .setAllowedResourceType(EmployeeResourceTypes.employee)
    .newEntry(ExampleEmployeeDirectory.doctorActive.identifier)
    .asEmployee()
    .doneEntry()
    .build();

  assert.equal(disableBundle.entry[0].request.method, EmployeeBundleMethods.disable);
  assert.equal(disableBundle.entry[0].resource.id, ExampleEmployeeDirectory.doctorActive.identifier);

  const purgeBundle = new BundleEditor()
    .setBundleOperation(EmployeeBundleOperations.purge)
    .setAllowedResourceType(EmployeeResourceTypes.employee)
    .newEntry(ExampleEmployeeDirectory.doctorPurgedHistorical.identifier)
    .asEmployee()
    .doneEntry()
    .build();

  assert.equal(purgeBundle.entry[0].request.method, EmployeeBundleMethods.purge);
  assert.equal(purgeBundle.entry[0].type, EmployeeBatchEntryTypes.purge);
  assert.equal(
    purgeBundle.entry[0].resource.meta.claims[EmployeeClaimKeys.identifier],
    ExampleEmployeeDirectory.doctorPurgedHistorical.identifier,
  );
});

test('Employee entry adapters build canonical search bundles from one active search entry', () => {
  const searchBundle = new BundleEditor()
    .setBundleOperation(EmployeeBundleOperations.search)
    .setAllowedResourceType(EmployeeResourceTypes.employee)
    .newEntry()
    .asEmployee()
    .setEmail(ExampleEmployeeDirectory.doctorActive.email)
    .setRole(ExampleEmployeeDirectory.doctorActive.role)
    .doneEntry()
    .build();

  assert.equal(searchBundle.resourceType, EmployeeSearchResourceType.bundle);
  assert.equal(searchBundle.type, EmployeeSearchResourceType.batch);
  assert.equal(searchBundle.entry[0].request.method, EmployeeBundleMethods.search);
  assert.equal(searchBundle.entry[0].request.url, EmployeeBundleRoutes.search);
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
});

test('buildEmployeeBatchBundleFromEntries preserves ready-made employee entries for multi-employee bundles', () => {
  const createControllerEntry = buildEmployeeBatchEntry({
    type: EmployeeBatchEntryTypes.create,
    method: EmployeeBundleMethods.create,
    resourceId: ExampleEmployeeDirectory.controllerActive.identifier,
    claims: buildEmployeeClaims({
      identifier: ExampleEmployeeDirectory.controllerActive.identifier,
      email: ExampleEmployeeDirectory.controllerActive.email,
      role: ExampleEmployeeDirectory.controllerActive.role,
    }),
  });

  const createDoctorEntry = buildEmployeeBatchEntry({
    type: EmployeeBatchEntryTypes.create,
    method: EmployeeBundleMethods.create,
    resourceId: ExampleEmployeeDirectory.doctorActive.identifier,
    claims: buildEmployeeClaims({
      identifier: ExampleEmployeeDirectory.doctorActive.identifier,
      email: ExampleEmployeeDirectory.doctorActive.email,
      role: ExampleEmployeeDirectory.doctorActive.role,
    }),
  });

  const bundle = buildEmployeeBatchBundleFromEntries({
    entries: [createControllerEntry, createDoctorEntry],
  });

  assert.equal(bundle.entry.length, 2);
});

test('buildEmployeePurgeBundle builds a one-entry purge batch bundle keyed by identifier', () => {
  const bundle = buildEmployeePurgeBundle({
    identifier: ExampleEmployeeDirectory.doctorPurgedHistorical.identifier,
  });

  assert.equal(bundle.entry[0].request.method, EmployeeBundleMethods.purge);
  assert.equal(bundle.entry[0].type, EmployeeBatchEntryTypes.purge);
});

test('employee search helpers build canonical batch POST bundles by default', () => {
  const bundle = buildEmployeeSearchBundle({
    claims: {
      [EmployeeClaimKeys.email]: ExampleEmployeeDirectory.controllerActive.email,
    },
  });
  assert.equal(bundle.entry[0].request.method, EmployeeBundleMethods.search);
  assert.equal(bundle.entry[0].request.url, EmployeeBundleRoutes.search);
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
