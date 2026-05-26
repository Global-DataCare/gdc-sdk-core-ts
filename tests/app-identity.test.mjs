import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_APP_VERSION,
  buildAppHeaders,
  normalizeAppId,
  normalizeAppVersion,
  resolveAppInfo,
} from '../dist/index.js';

test('normalizeAppId converts URLs and bare domains to reverse DNS', () => {
  assert.equal(normalizeAppId('https://globaldatacare.es/app'), 'es.globaldatacare');
  assert.equal(normalizeAppId('globaldatacare.es'), 'es.globaldatacare');
});

test('normalizeAppId preserves explicit stable identifiers when they are not reversible hostnames', () => {
  assert.equal(normalizeAppId('es.globaldatacare.portal'), 'es.globaldatacare.portal');
  assert.equal(normalizeAppId('mobile-app-prod'), 'mobile-app-prod');
  assert.equal(normalizeAppId('localhost'), 'localhost');
});

test('normalizeAppVersion defaults to v1.0 and trims explicit values', () => {
  assert.equal(normalizeAppVersion(), DEFAULT_APP_VERSION);
  assert.equal(normalizeAppVersion('  v2.3.4  '), 'v2.3.4');
});

test('resolveAppInfo returns canonical app identity and headers', () => {
  const resolved = resolveAppInfo({
    appId: 'https://portal.globaldatacare.es/mobile',
    appType: 'Family',
    sector: 'health-care',
  });

  assert.deepEqual(resolved, {
    appId: 'es.globaldatacare.portal',
    appVersion: 'v1.0',
    appType: 'Family',
    sector: 'health-care',
  });

  assert.deepEqual(buildAppHeaders(resolved), {
    AppId: 'es.globaldatacare.portal',
    AppVersion: 'v1.0',
  });
});
