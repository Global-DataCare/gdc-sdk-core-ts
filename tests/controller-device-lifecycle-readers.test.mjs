import assert from 'node:assert/strict';
import test from 'node:test';
import { readActivationCode, readCommercialOfferId } from '../dist/index.js';

test('lifecycle readers accept the complete submit/poll result and canonical resource claims', () => {
  const result = {
    submit: { status: 202 },
    poll: {
      status: 200,
      body: {
        data: [{ resource: { meta: { claims: {
          'org.schema.Offer.identifier': 'urn:example:offer',
          'org.schema.IndividualProduct.serialNumber': 'lic-automatic-access',
        } } } }],
      },
    },
  };

  assert.equal(readCommercialOfferId(result), 'urn:example:offer');
  assert.equal(readActivationCode(result), 'lic-automatic-access');
});

test('lifecycle readers accept a canonical body without the submit/poll envelope', () => {
  const body = { entry: [{ resource: { meta: { claims: {
    'org.schema.Offer.identifier': 'urn:example:resource-offer',
    'org.schema.IndividualProduct.serialNumber': 'lic-resource-access',
  } } } }] };

  assert.equal(readCommercialOfferId(body), 'urn:example:resource-offer');
  assert.equal(readActivationCode(body), 'lic-resource-access');
});
