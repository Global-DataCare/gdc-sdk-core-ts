import test from 'node:test';
import assert from 'node:assert/strict';

import {
  EXAMPLE_CONTROLLER_DID,
  EXAMPLE_DEFAULT_ICA_DID,
  EXAMPLE_SERVICE_PUBLIC_DID,
} from 'gdc-common-utils-ts/examples';
import { ActorKinds, MemoryIdentityStore } from '../dist/index.js';

test('memory identity store persists did documents and identity partitions', async () => {
  const store = new MemoryIdentityStore();

  await store.setTransportIdentity({
    did: EXAMPLE_DEFAULT_ICA_DID,
    didDocument: { id: EXAMPLE_DEFAULT_ICA_DID },
    signingKid: 'device-sign-001',
  });
  await store.setActorIdentity({
    did: EXAMPLE_CONTROLLER_DID,
    kind: ActorKinds.OrganizationController,
  });
  await store.setProviderIdentity({
    did: EXAMPLE_SERVICE_PUBLIC_DID,
    smartTokenEndpoint: 'https://operator.example.net/acme/token',
  });

  assert.equal((await store.getTransportIdentity())?.signingKid, 'device-sign-001');
  assert.equal((await store.getActorIdentity())?.kind, ActorKinds.OrganizationController);
  assert.equal((await store.getProviderIdentity())?.smartTokenEndpoint, 'https://operator.example.net/acme/token');
  assert.equal((await store.getDidDocument(EXAMPLE_DEFAULT_ICA_DID))?.id, EXAMPLE_DEFAULT_ICA_DID);
});
