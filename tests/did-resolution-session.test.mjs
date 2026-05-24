import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MemoryIdentityStore,
  createStaticDiscoveryFacade,
  getProviderDidFromSubjectDid,
  resolveProviderIdentityForSubject,
} from '../dist/index.js';

test('provider did is derived from subject did without inventing urls manually', async () => {
  const subjectDid = 'did:web:host.example.org:acme:cds-es:v1:health-care:family:subject-001:v3-RoleCode|ONESELF';
  assert.equal(
    getProviderDidFromSubjectDid(subjectDid),
    'did:web:host.example.org:acme:cds-es:v1:health-care',
  );
});

test('provider identity resolution caches did document and smart endpoint', async () => {
  const providerDid = 'did:web:host.example.org:acme:cds-es:v1:health-care';
  const discovery = createStaticDiscoveryFacade({
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
  });
  const store = new MemoryIdentityStore();

  const provider = await resolveProviderIdentityForSubject(
    `${providerDid}:family:subject-001:v3-RoleCode|ONESELF`,
    { discovery, store },
  );

  assert.equal(provider.did, providerDid);
  assert.equal(provider.smartTokenEndpoint, 'https://operator.example.net/acme/token');
  assert.equal((await store.getDidDocument(providerDid))?.id, providerDid);
});
