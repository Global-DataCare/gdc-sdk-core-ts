import test from 'node:test';
import assert from 'node:assert/strict';

import { ActorKinds, MemoryIdentityStore } from '../dist/index.js';

test('memory identity store persists did documents and identity partitions', async () => {
  const store = new MemoryIdentityStore();

  await store.setTransportIdentity({
    did: 'did:web:device.example.org',
    didDocument: { id: 'did:web:device.example.org' },
    signingKid: 'device-sign-001',
  });
  await store.setActorIdentity({
    did: 'did:web:people.example.org:controllers:primary',
    kind: ActorKinds.OrganizationController,
  });
  await store.setProviderIdentity({
    did: 'did:web:public.acme.org',
    smartTokenEndpoint: 'https://operator.example.net/acme/token',
  });

  assert.equal((await store.getTransportIdentity())?.signingKid, 'device-sign-001');
  assert.equal((await store.getActorIdentity())?.kind, ActorKinds.OrganizationController);
  assert.equal((await store.getProviderIdentity())?.smartTokenEndpoint, 'https://operator.example.net/acme/token');
  assert.equal((await store.getDidDocument('did:web:device.example.org'))?.id, 'did:web:device.example.org');
});
