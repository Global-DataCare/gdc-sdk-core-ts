import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createLifecycleResultReader,
  EXAMPLE_HOST_ROUTE_CONTEXT,
  EXAMPLE_LEGAL_ORGANIZATION_ORDER_RESPONSE,
  EXAMPLE_TENANT_DISABLE_MESSAGE,
  EXAMPLE_TENANT_DISABLE_REQUEST_TYPE,
  OrganizationLifecycleEditor,
  ClaimsOrganizationSchemaorg,
  cloneExample,
} from '../../gdc-common-utils-ts/dist/index.js';

import {
  HostLifecycleRequestType,
  submitHostedTenantLifecycleWithDeps,
} from '../dist/index.js';

test('submitHostedTenantLifecycleWithDeps accepts shared organization lifecycle editors', async () => {
  const calls = [];
  const organizationEditor = new OrganizationLifecycleEditor()
    .setIdentifier(String(EXAMPLE_TENANT_DISABLE_MESSAGE.claims[ClaimsOrganizationSchemaorg.identifier]))
    .setIdentifierValue(String(EXAMPLE_TENANT_DISABLE_MESSAGE.claims[ClaimsOrganizationSchemaorg.identifierValue]))
    .setTaxId(String(EXAMPLE_TENANT_DISABLE_MESSAGE.claims[ClaimsOrganizationSchemaorg.taxId]))
    .setRequestType(EXAMPLE_TENANT_DISABLE_REQUEST_TYPE);

  const result = await submitHostedTenantLifecycleWithDeps({
    hostCtx: cloneExample(EXAMPLE_HOST_ROUTE_CONTEXT),
    input: {
      organizationEditor,
      timeoutSeconds: 12,
      intervalSeconds: 3,
    },
    requestType: HostLifecycleRequestType.Disable,
    submitPath: (ctx) => `/host/${ctx.jurisdiction}/${ctx.sector}/organization/_disable`,
    pollPath: (ctx) => `/host/${ctx.jurisdiction}/${ctx.sector}/organization/_disable-response`,
    thidPrefix: 'host-disable',
    submitAndPoll: async (...args) => {
      calls.push(args);
      return cloneExample(EXAMPLE_LEGAL_ORGANIZATION_ORDER_RESPONSE);
    },
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0][2].body.data[0].type, EXAMPLE_TENANT_DISABLE_REQUEST_TYPE);
  assert.equal(
    calls[0][2].body.data[0].resource.meta.claims[ClaimsOrganizationSchemaorg.identifierValue],
    EXAMPLE_TENANT_DISABLE_MESSAGE.claims[ClaimsOrganizationSchemaorg.identifierValue],
  );
  assert.deepEqual(calls[0][3], {
    timeoutMs: 12_000,
    intervalMs: 3_000,
  });
  assert.equal(result.poll.status, 200);

  const reader = createLifecycleResultReader(result.poll.body);
  assert.equal(reader.getFailedIdentifiers().length, 0);
});
