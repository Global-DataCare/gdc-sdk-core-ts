import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createStaticDiscoveryFacade,
  resolveSmartTokenEndpointForSubject,
} from '../dist/index.js';

test('smart endpoint resolver returns endpoint from provider did document service[]', async () => {
  const providerDid = 'did:web:host.example.org:acme:cds-es:v1:health-care';
  const endpoint = await resolveSmartTokenEndpointForSubject(
    `${providerDid}:family:subject-001:v3-RoleCode|ONESELF`,
    {
      discovery: createStaticDiscoveryFacade({
        didDocuments: {
          [providerDid]: {
            id: providerDid,
            service: [
              {
                id: '#identity:openid:smart:token',
                type: 'ApiService',
                serviceEndpoint: 'https://operator.example.net/acme/token',
              },
            ],
          },
        },
      }),
    },
  );

  assert.equal(endpoint, 'https://operator.example.net/acme/token');
});
