// Flow contract: reuse shared test fixtures and canonical types; do not introduce duplicated literals.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  EXAMPLE_FORM_SUBJECT_IDENTIFIER_VALUE,
  EXAMPLE_INDEX_PROVIDER_SECTOR_DID_WEB,
  EXAMPLE_JURISDICTION,
  EXAMPLE_PROVIDER_ORGANIZATION_URL,
  EXAMPLE_SUBJECT_IDENTIFIER_TYPE,
} from 'gdc-common-utils-ts/examples/shared';
import { buildSubjectIdentifierLedgerPayload } from 'gdc-common-utils-ts/utils/subject-identity';
import { normalizeDidWeb } from 'gdc-common-utils-ts/utils/did';
import {
  buildPdqmPatientMatchGatewayBody,
  buildPdqmPatientMatchRequest as buildPdqmRequest,
  renderGatewayMessageRequest,
  resolveSubjectIndexProvider,
  TransportProfiles,
} from '../dist/index.js';

test('resolves only the index provider DID from a governed subject identifier', async () => {
  const calls = [];
  const result = await resolveSubjectIndexProvider({
    codingSystem: EXAMPLE_SUBJECT_IDENTIFIER_TYPE,
    jurisdiction: EXAMPLE_JURISDICTION,
    value: EXAMPLE_FORM_SUBJECT_IDENTIFIER_VALUE,
  }, {
    ledger: {
      async readSubjectIdentifier(subjectLookupAssetId) {
        calls.push(subjectLookupAssetId);
        return buildSubjectIdentifierLedgerPayload(EXAMPLE_INDEX_PROVIDER_SECTOR_DID_WEB);
      },
    },
  });

  assert.match(result.subjectLookupAssetId, /^urn:multibase:z/);
  assert.deepEqual(calls, [result.subjectLookupAssetId]);
  assert.equal(result.indexProviderDid, normalizeDidWeb(EXAMPLE_INDEX_PROVIDER_SECTOR_DID_WEB));
  assert.deepEqual(Object.keys(result).sort(), ['indexProviderDid', 'subjectLookupAssetId']);
});

test('builds IHE PDQm Patient match as one Parameters body, not an array or Bundle', () => {
  const patient = {
    resourceType: 'Patient',
    identifier: [{
      system: EXAMPLE_SUBJECT_IDENTIFIER_TYPE,
      value: EXAMPLE_FORM_SUBJECT_IDENTIFIER_VALUE,
    }],
  };
  const request = buildPdqmRequest({
    fhirBaseUrl: EXAMPLE_PROVIDER_ORGANIZATION_URL,
    patient,
    onlyCertainMatches: true,
  });

  assert.equal(request.method, 'POST');
  assert.equal(new URL(request.url).pathname, '/Patient/$match');
  assert.equal(request.body.resourceType, 'Parameters');
  assert.deepEqual(request.body.parameter, [
    { name: 'resource', resource: patient },
    { name: 'onlyCertainMatches', valueBoolean: true },
  ]);
  assert.equal(Array.isArray(request.body), false);
  assert.doesNotMatch(JSON.stringify(request), /urn:multibase|\$ihe-pix/);
});

test('keeps one Parameters entry in the same DIDComm body for plain and strict transport', async () => {
  const match = buildPdqmRequest({
    fhirBaseUrl: EXAMPLE_PROVIDER_ORGANIZATION_URL,
    patient: {
      resourceType: 'Patient',
      identifier: [{
        system: EXAMPLE_SUBJECT_IDENTIFIER_TYPE,
        value: EXAMPLE_FORM_SUBJECT_IDENTIFIER_VALUE,
      }],
    },
  });
  const body = buildPdqmPatientMatchGatewayBody(match);
  const message = { thid: 'pdqm-match-thread', body };
  const packed = [];
  const secureAdapter = {
    async pack(value) { packed.push(value); return 'compact-jwe'; },
    async unpack(value) { return value; },
  };

  const plain = await renderGatewayMessageRequest(
    message,
    TransportProfiles.DidcommPlainJson,
  );
  const strict = await renderGatewayMessageRequest(
    message,
    TransportProfiles.DidcommEncryptedForm,
    secureAdapter,
  );

  assert.equal(plain.contentType, 'application/didcomm-plain+json');
  assert.equal(plain.body.body.data.length, 1);
  assert.equal(plain.body.body.data[0].resource.resourceType, 'Parameters');
  assert.deepEqual(packed, [message]);
  assert.equal(strict.contentType, 'application/x-www-form-urlencoded');
  assert.equal(strict.body, 'request=compact-jwe');
});

test('rejects an expanded ledger result instead of accepting card data', async () => {
  await assert.rejects(() => resolveSubjectIndexProvider({
    codingSystem: EXAMPLE_SUBJECT_IDENTIFIER_TYPE,
    jurisdiction: EXAMPLE_JURISDICTION,
    value: EXAMPLE_FORM_SUBJECT_IDENTIFIER_VALUE,
  }, {
    ledger: {
      async readSubjectIdentifier() {
        return {
          indexProviderDid: EXAMPLE_INDEX_PROVIDER_SECTOR_DID_WEB,
          card: { identifier: { value: 'urn:example:obsolete-card' } },
        };
      },
    },
  }), /subject_identifier_payload_must_contain_only_index_provider_did/);
});

test('documents PDQm POST and the unchanged Bundle response across transports', () => {
  const guide = readFileSync(new URL('../docs/101-SUBJECT_INDEX_PROVIDER_RESOLUTION.md', import.meta.url), 'utf8');
  const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
  const skills = [
    '../.codex/skills/enforce-release-test-discipline/SKILL.md',
    '../.codex/skills/preserve-workspace-node-runtime/SKILL.md',
  ].map((path) => readFileSync(new URL(path, import.meta.url), 'utf8'));

  assert.match(guide, /POST \[base\]\/Patient\/\$match/);
  assert.match(guide, /`Parameters\.parameter\[\]`/);
  assert.match(guide, /response is one FHIR search `Bundle`/);
  assert.match(guide, /DIDComm plain `body`/);
  assert.match(guide, /Strict mode encrypts that same Bundle/);
  assert.doesNotMatch(guide, /PIXm|\$ihe-pix/);
  assert.match(readme, /101-SUBJECT_INDEX_PROVIDER_RESOLUTION\.md/);
  for (const skill of skills) {
    assert.match(skill, /POST\s+`Patient\/\$match`/);
    assert.match(skill, /body\.data\[0\]\.resource/);
    assert.doesNotMatch(skill, /PIXm|\$ihe-pix/);
  }
});
