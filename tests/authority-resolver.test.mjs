import assert from 'node:assert/strict';
import test from 'node:test';

import {
  EXAMPLE_HOSTING_OPERATOR_DID,
  EXAMPLE_JURISDICTION,
  EXAMPLE_SECTOR,
  EXAMPLE_TENANT_IDENTIFIER,
} from 'gdc-common-utils-ts/examples';
import { createHostedDidWeb } from 'gdc-common-utils-ts';

import { StaticAuthorityResolver } from '../dist/authority-resolver.js';

test('StaticAuthorityResolver resolves one preloaded tenant authority record', async () => {
  const tenantDidWeb = createHostedDidWeb(EXAMPLE_HOSTING_OPERATOR_DID, EXAMPLE_TENANT_IDENTIFIER, {
    jurisdiction: EXAMPLE_JURISDICTION,
    version: 'v1',
    sector: EXAMPLE_SECTOR,
  });
  const resolver = new StaticAuthorityResolver([{
    authorityDidWeb: 'did:web:gw.example.org',
    authorityBaseUrl: 'https://gw.example.org/',
    tenantDidWeb,
    tenantId: EXAMPLE_TENANT_IDENTIFIER,
    jurisdiction: EXAMPLE_JURISDICTION,
    sector: EXAMPLE_SECTOR,
  }]);

  const resolved = await resolver.resolveAuthority({
    tenantId: EXAMPLE_TENANT_IDENTIFIER,
    jurisdiction: EXAMPLE_JURISDICTION,
    sector: EXAMPLE_SECTOR,
  });

  assert.equal(resolved.source, 'catalog');
  assert.equal(resolved.authorityDidWeb, 'did:web:gw.example.org');
  assert.equal(resolved.tenantDidWeb, tenantDidWeb);
  assert.equal(resolved.matchedBy, 'tenant-context');
});

test('StaticAuthorityResolver falls back to legacy authority derivation from base URL', async () => {
  const resolver = new StaticAuthorityResolver();

  const resolved = await resolver.resolveAuthority({
    authorityBaseUrl: 'https://gw.example.org',
    tenantId: EXAMPLE_TENANT_IDENTIFIER,
    jurisdiction: EXAMPLE_JURISDICTION,
    sector: EXAMPLE_SECTOR,
    subjectSameAs: 'CARD-724-0000-111-222-333-444',
  });

  assert.equal(resolved.source, 'legacy');
  assert.equal(resolved.authorityDidWeb, 'did:web:gw.example.org');
  assert.equal(resolved.authorityBaseUrl, 'https://gw.example.org/');
  assert.equal(
    resolved.tenantDidWeb,
    createHostedDidWeb('did:web:gw.example.org', EXAMPLE_TENANT_IDENTIFIER, {
      jurisdiction: EXAMPLE_JURISDICTION,
      version: 'v1',
      sector: EXAMPLE_SECTOR,
    }),
  );
  assert.equal(resolved.matchedBy, 'subject-same-as');
});
