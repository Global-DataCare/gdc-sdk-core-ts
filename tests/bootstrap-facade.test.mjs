// Always create JSDoc, do not use strings inline in keys nor values, use types instead, and reuse the data test examples.
import test from 'node:test';
import assert from 'node:assert/strict';

import { createBootstrapFacade, ServiceCapability } from '../dist/index.js';

test('bootstrap facade builds canonical activation payload and warns on deprecated legacy credentials', () => {
  const facade = createBootstrapFacade();
  const payload = facade.buildOrganizationActivationRequest({
    vpToken: 'header.payload.signature',
    controller: {
      did: 'did:web:people.example.org:controllers:primary',
      publicKeyJwk: { kid: 'controller-sig-001' },
    },
    organizationCredential: { id: 'legacy-org' },
  });
  const validation = facade.validateActivationRequest(payload);

  assert.equal(payload.vp_token, 'header.payload.signature');
  assert.equal(payload.controller?.did, 'did:web:people.example.org:controllers:primary');
  assert.equal(validation.ok, true);
  assert.deepEqual(validation.warnings.map((issue) => issue.code), ['deprecated-organization-credential']);
});

test('bootstrap facade organization activation accumulates service capabilities and serializes canonical serviceType', () => {
  const facade = createBootstrapFacade();
  const organizationActivation = facade.createOrganizationActivation({
    vpToken: 'header.payload.signature',
    additionalClaims: {
      'org.schema.Service.category': 'health-care',
    },
  });

  organizationActivation
    .setServiceUrl('https://connector.example.net/acme/cds-es/v1/health-care')
    .addServiceCapability(ServiceCapability.IndexProvider)
    .addServiceCapability(ServiceCapability.IndexReader)
    .addServiceCapability(ServiceCapability.DigitalTwinReader)
    .addServiceCapability(ServiceCapability.IndexProvider);

  const serviceClaims = organizationActivation.buildServiceClaims();

  assert.equal(
    serviceClaims['org.schema.Service.serviceType'],
    'indexing.cruds,indexing.rs,digitaltwin.rs',
  );
  assert.equal(
    serviceClaims['org.schema.Service.url'],
    'https://connector.example.net/acme/cds-es/v1/health-care',
  );
  assert.equal(serviceClaims['org.schema.Service.category'], 'health-care');
});
