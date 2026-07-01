import assert from 'node:assert/strict';
import test from 'node:test';

import { StaticAuthorityResolver } from '../dist/authority-resolver.js';

test('StaticAuthorityResolver resolves one preloaded tenant authority record', async () => {
  const resolver = new StaticAuthorityResolver([{
    authorityDidWeb: 'did:web:gw.example.org',
    authorityBaseUrl: 'https://gw.example.org/',
    tenantDidWeb: 'did:web:gw.example.org:acme-id:cds-ES:v1:health-care',
    tenantId: 'acme-id',
    jurisdiction: 'ES',
    sector: 'health-care',
  }]);

  const resolved = await resolver.resolveAuthority({
    tenantId: 'acme-id',
    jurisdiction: 'ES',
    sector: 'health-care',
  });

  assert.equal(resolved.source, 'catalog');
  assert.equal(resolved.authorityDidWeb, 'did:web:gw.example.org');
  assert.equal(resolved.tenantDidWeb, 'did:web:gw.example.org:acme-id:cds-ES:v1:health-care');
  assert.equal(resolved.matchedBy, 'tenant-context');
});

test('StaticAuthorityResolver falls back to legacy authority derivation from base URL', async () => {
  const resolver = new StaticAuthorityResolver();

  const resolved = await resolver.resolveAuthority({
    authorityBaseUrl: 'https://gw.example.org',
    tenantId: 'acme-id',
    jurisdiction: 'ES',
    sector: 'health-care',
    subjectSameAs: 'UHC-724-0000-111-222-333-444',
  });

  assert.equal(resolved.source, 'legacy');
  assert.equal(resolved.authorityDidWeb, 'did:web:gw.example.org');
  assert.equal(resolved.authorityBaseUrl, 'https://gw.example.org/');
  assert.equal(resolved.tenantDidWeb, 'did:web:gw.example.org:acme-id:cds-ES:v1:health-care');
  assert.equal(resolved.matchedBy, 'subject-same-as');
});
