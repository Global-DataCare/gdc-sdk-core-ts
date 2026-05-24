import test from 'node:test';
import assert from 'node:assert/strict';

import { createStaticDiscoveryFacade } from '../dist/index.js';

test('static discovery facade returns seeded did documents and provider entries', async () => {
  const providerDid = 'did:web:public.acme.org';
  const facade = createStaticDiscoveryFacade({
    didDocuments: {
      [providerDid]: { id: providerDid },
    },
    providers: [
      { did: providerDid, smartTokenEndpoint: 'https://operator.example.net/acme/token' },
    ],
  });

  assert.equal((await facade.resolveDidDocument(providerDid))?.id, providerDid);
  assert.equal((await facade.discoverServiceProviders({ did: providerDid }))[0]?.smartTokenEndpoint, 'https://operator.example.net/acme/token');
});
