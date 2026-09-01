// Flow contract: SDK lifecycle readers consume GW Bundle entry claims without replacing the entry resource, and preserve resource-scoped compatibility.
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

test('activation reader consumes Order response entry claims while preserving the Invoice resource', () => {
  const invoice = { resourceType: 'Bundle', type: 'collection', entry: [] };
  const body = { data: [{
    meta: { claims: { 'org.schema.IndividualProduct.serialNumber': 'lic-order-entry' } },
    resource: invoice,
  }] };

  assert.equal(readActivationCode(body), 'lic-order-entry');
  assert.equal(body.data[0].resource, invoice);
});
