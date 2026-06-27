import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * Teaching goal:
 * keep one runtime-neutral wallet contract in sdk-core while preserving the
 * legacy app-facing shape and allowing richer managed-key flows.
 */
test('IWallet keeps the legacy app-shaped contract valid', async () => {
  /** @type {import('../dist/index.js').IWallet} */
  const wallet = {
    async provisionKeys(entityId) {
      return {
        keys: [
          { kid: `${entityId}-sig`, kty: 'AKP', use: 'sig', alg: 'ML-DSA-44' },
          { kid: `${entityId}-enc`, kty: 'OKP', use: 'enc', crv: 'ML-KEM-768' },
        ],
      };
    },
    async digest(data) {
      return data;
    },
    async protectConfidentialData(doc) {
      return doc;
    },
    async unprotectConfidentialData(doc) {
      return doc;
    },
  };

  const provisioned = await wallet.provisionKeys('legacy-wallet');
  assert.equal(provisioned.keys.length, 2);
  assert.equal(await wallet.digest('abc', 'SHA-256'), 'abc');
});

test('IWallet supports richer managed-key methods without breaking the base contract', async () => {
  /** @type {import('../dist/index.js').IWallet} */
  const wallet = {
    async provisionKeys(entityId) {
      return {
        keys: [
          { kid: `${entityId}-sig`, kty: 'EC', use: 'sig', alg: 'ES384' },
          { kid: `${entityId}-enc`, kty: 'OKP', use: 'enc', crv: 'ML-KEM-768' },
        ],
      };
    },
    async digest(data) {
      return data;
    },
    async protectConfidentialData(doc) {
      return doc;
    },
    async unprotectConfidentialData(doc) {
      return doc;
    },
    async provisionManagedKeys(context) {
      const profileId = context.profile?.profileId ?? context.runtime?.runtimeId ?? 'default';
      return {
        keys: [
          { kid: `${profileId}-sig`, kty: 'EC', use: 'sig', alg: 'ES384' },
          { kid: `${profileId}-enc`, kty: 'OKP', use: 'enc', crv: 'ML-KEM-768' },
        ],
      };
    },
    async getPublicJwks() {
      return [
        {
          kid: 'sig-key',
          ownerScope: 'runtime',
          purpose: 'comm-signing',
          use: 'sig',
          alg: 'ES384',
          publicJwk: { kid: 'sig-key', kty: 'EC', use: 'sig', alg: 'ES384' },
        },
      ];
    },
  };

  const managed = await wallet.provisionManagedKeys?.(
    {
      runtime: {
        runtimeId: 'portal-runtime:main',
        runtimeType: 'web-bff',
      },
    },
    {
      ownerScope: 'runtime',
      purposes: ['comm-signing', 'comm-encryption'],
      seedMaterial: 'runtime-seed-001',
      mode: 'deterministic',
    },
  );

  const jwks = await wallet.getPublicJwks?.(
    {
      runtime: {
        runtimeId: 'portal-runtime:main',
        runtimeType: 'web-bff',
      },
    },
    {
      ownerScope: 'runtime',
      purpose: 'comm-signing',
    },
  );

  assert.equal(managed?.keys.length, 2);
  assert.equal(jwks?.length, 1);
  assert.equal(jwks?.[0]?.purpose, 'comm-signing');
});
