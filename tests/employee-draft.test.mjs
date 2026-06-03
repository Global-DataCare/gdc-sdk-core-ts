import test from 'node:test';
import assert from 'node:assert/strict';

import {
  EmployeeDraft,
  buildEmployeeBatchEntry,
  buildEmployeeClaims,
  buildEmployeeSearchBundle,
  buildEmployeeSearchQuery,
  buildSearchBundle,
} from '../dist/index.js';

test('EmployeeDraft builds canonical employee claims', () => {
  const claims = new EmployeeDraft()
    .setIdentifier('urn:uuid:employee-001')
    .setEmail('receptionist1@acme.org')
    .setRole('ISCO-08|4226')
    .setMemberOfOrgTaxId('VATES-B00112233')
    .toClaims();

  assert.equal(claims['@context'], 'org.schema');
  assert.equal(claims['org.schema.Person.identifier'], 'urn:uuid:employee-001');
  assert.equal(claims['org.schema.Person.email'], 'receptionist1@acme.org');
  assert.equal(claims['org.schema.Person.hasOccupation.identifier.value'], 'ISCO-08|4226');
  assert.equal(claims['org.schema.Person.memberOf.taxID'], 'VATES-B00112233');
});

test('buildEmployeeClaims merges additional claims and canonical setters', () => {
  const claims = buildEmployeeClaims({
    email: 'vet.oncall@example.org',
    role: 'ISCO-08|2250',
    additionalClaims: {
      '@context': 'org.schema',
      'org.schema.Person.worksFor': 'did:web:clinic.example.org',
    },
  });

  assert.equal(claims['org.schema.Person.email'], 'vet.oncall@example.org');
  assert.equal(claims['org.schema.Person.hasOccupation.identifier.value'], 'ISCO-08|2250');
  assert.equal(claims['org.schema.Person.worksFor'], 'did:web:clinic.example.org');
});

test('buildEmployeeBatchEntry builds a claims-first Employee entry', () => {
  const entry = buildEmployeeBatchEntry({
    requestType: 'Employee-create-request-v1.0',
    requestMethod: 'POST',
    resourceId: 'employee-001',
    employeeClaims: buildEmployeeClaims({
      email: 'receptionist1@acme.org',
      role: 'ISCO-08|4226',
    }),
  });

  assert.equal(entry.type, 'Employee-create-request-v1.0');
  assert.equal(entry.request.method, 'POST');
  assert.equal(entry.resource.resourceType, 'Employee');
  assert.equal(entry.resource.id, 'employee-001');
  assert.equal(entry.resource.meta.claims['org.schema.Person.email'], 'receptionist1@acme.org');
});

test('employee search helpers keep the legacy GET query builder', () => {
  const query = buildEmployeeSearchQuery({
    employeeClaims: {
      'org.schema.Person.email': 'receptionist1@acme.org',
      'org.schema.Person.hasOccupation.identifier.value': 'ISCO-08|4226',
    },
  });
  assert.match(query, /^Employee\?/);
  assert.match(query, /org\.schema\.Person\.email=receptionist1%40acme\.org/);
  assert.match(query, /org\.schema\.Person\.hasOccupation\.identifier\.value=ISCO-08%7C4226/);
});

test('employee search helpers build canonical batch POST bundles by default', () => {
  const bundle = buildEmployeeSearchBundle({
    employeeClaims: {
      'org.schema.Person.email': 'receptionist1@acme.org',
    },
  });
  assert.equal(bundle.resourceType, 'Bundle');
  assert.equal(bundle.type, 'batch');
  assert.equal(bundle.entry[0].request.method, 'POST');
  assert.equal(bundle.entry[0].request.url, 'Employee/_search');
  assert.deepEqual(bundle.entry[0].resource, {
    resourceType: 'Parameters',
    parameter: [
      { name: 'org.schema.Person.email', valueString: 'receptionist1@acme.org' },
    ],
  });
});

test('generic search bundles still support legacy GET query encoding', () => {
  const bundle = buildSearchBundle({
    resourceType: 'Employee',
    encoding: 'get-query',
    searchParams: {
      'org.schema.Person.email': 'receptionist1@acme.org',
    },
  });

  assert.equal(bundle.entry[0].request.method, 'GET');
  assert.equal(bundle.entry[0].request.url, 'Employee?org.schema.Person.email=receptionist1%40acme.org');
});
