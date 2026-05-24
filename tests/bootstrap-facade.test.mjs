import test from 'node:test';
import assert from 'node:assert/strict';

import { createBootstrapFacade } from '../dist/index.js';

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
