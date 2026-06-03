import test from 'node:test';
import assert from 'node:assert/strict';

import {
  EmployeeDraft,
  buildEmployeeSearchBundle,
} from '../dist/index.js';

const ExampleEmployeeClaims = Object.freeze({
  email: 'shared.professional@example.org',
  controllerRole: 'ISCO-08|1120',
  doctorRole: 'ISCO-08|2211',
  purgedDoctorIdentifier: 'urn:uuid:employee-doctor-purged-000',
});

test('101: employee draft and search semantics stay explicit', () => {
  const exactHistoricalSearch = buildEmployeeSearchBundle({
    employeeClaims: {
      'org.schema.Person.identifier': ExampleEmployeeClaims.purgedDoctorIdentifier,
    },
  });

  assert.equal(exactHistoricalSearch.entry[0].request.method, 'POST');
  assert.equal(exactHistoricalSearch.entry[0].request.url, 'Employee/_search');
  assert.deepEqual(exactHistoricalSearch.entry[0].resource, {
    resourceType: 'Parameters',
    parameter: [
      {
        name: 'org.schema.Person.identifier',
        valueString: ExampleEmployeeClaims.purgedDoctorIdentifier,
      },
    ],
  });

  const sameEmailDifferentRoles = [
    new EmployeeDraft()
      .setEmail(ExampleEmployeeClaims.email)
      .setRole(ExampleEmployeeClaims.controllerRole)
      .toClaims(),
    new EmployeeDraft()
      .setEmail(ExampleEmployeeClaims.email)
      .setRole(ExampleEmployeeClaims.doctorRole)
      .toClaims(),
  ];

  assert.equal(sameEmailDifferentRoles[0]['org.schema.Person.email'], ExampleEmployeeClaims.email);
  assert.equal(sameEmailDifferentRoles[1]['org.schema.Person.email'], ExampleEmployeeClaims.email);
  assert.notEqual(
    sameEmailDifferentRoles[0]['org.schema.Person.hasOccupation.identifier.value'],
    sameEmailDifferentRoles[1]['org.schema.Person.hasOccupation.identifier.value'],
  );
});
