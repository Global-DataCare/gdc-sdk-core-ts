import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildLegalOrganizationVerificationGatewayRequestBundle,
  createLegalOrganizationVerificationGatewaySubmission,
  resolveLegalOrganizationVerificationGatewayPath,
} from '../dist/index.js';
import {
  EXAMPLE_CONTROLLER_BINDING,
  EXAMPLE_DEMO_PORTAL_ID_TOKEN,
  EXAMPLE_EMAIL_CONTROLLER_ORG,
  EXAMPLE_HOSTING_OPERATOR_DID,
  EXAMPLE_JURISDICTION,
  EXAMPLE_LEGAL_ORGANIZATION_TAX_ID,
  EXAMPLE_ORGANIZATION_LEGAL_NAME,
  EXAMPLE_SECTOR,
  EXAMPLE_SIGNED_TERMS_PDF_URL,
} from 'gdc-common-utils-ts/examples/shared';
import {
  ClaimsOrganizationSchemaorg,
  ClaimsPersonSchemaorg,
  ClaimsServiceSchemaorg,
} from 'gdc-common-utils-ts/constants/schemaorg';

test('101: portal/backend submits the first legal-organization ICA verification step to GW CORE host _transaction', () => {
  const verificationBundle = buildLegalOrganizationVerificationGatewayRequestBundle({
    claims: {
      '@context': 'org.schema',
      [ClaimsOrganizationSchemaorg.legalName]: EXAMPLE_ORGANIZATION_LEGAL_NAME,
      [ClaimsOrganizationSchemaorg.identifierType]: 'taxID',
      [ClaimsOrganizationSchemaorg.identifierValue]: EXAMPLE_LEGAL_ORGANIZATION_TAX_ID,
      [ClaimsOrganizationSchemaorg.taxId]: EXAMPLE_LEGAL_ORGANIZATION_TAX_ID,
      [ClaimsOrganizationSchemaorg.addressCountry]: EXAMPLE_JURISDICTION,
      [ClaimsPersonSchemaorg.email]: EXAMPLE_EMAIL_CONTROLLER_ORG,
      [ClaimsServiceSchemaorg.category]: EXAMPLE_SECTOR,
    },
    controller: EXAMPLE_CONTROLLER_BINDING,
    legalRepresentativePayload: {
      email: EXAMPLE_EMAIL_CONTROLLER_ORG,
    },
    attachments: [{
      id: 'signed-terms-pdf-001',
      media_type: 'application/pdf',
      data: {
        links: [EXAMPLE_SIGNED_TERMS_PDF_URL],
      },
    }],
  });

  const submission = createLegalOrganizationVerificationGatewaySubmission({
    target: { providerDidWeb: EXAMPLE_HOSTING_OPERATOR_DID },
    route: {
      jurisdiction: EXAMPLE_JURISDICTION,
      hostNetwork: 'test-network',
    },
    idToken: EXAMPLE_DEMO_PORTAL_ID_TOKEN,
    body: verificationBundle,
  });

  assert.equal(
    resolveLegalOrganizationVerificationGatewayPath({
      jurisdiction: EXAMPLE_JURISDICTION,
      hostNetwork: 'test-network',
    }),
    '/host/cds-es/v1/test-network/registry/org.schema/Organization/_transaction',
  );
  assert.equal(submission.authorization.tokenType, 'id_token');
  assert.equal(
    submission.endpointUrl,
    'https://host.example.org/host/cds-es/v1/test-network/registry/org.schema/Organization/_transaction',
  );
  assert.equal(
    submission.body.data[0]?.meta?.claims?.[ClaimsOrganizationSchemaorg.identifierValue],
    EXAMPLE_LEGAL_ORGANIZATION_TAX_ID,
  );
  assert.equal(
    submission.body.data[0]?.resource?.controller?.publicKeyJwk,
    EXAMPLE_CONTROLLER_BINDING.publicKeyJwk,
  );
  assert.equal(
    submission.body.attachments?.[0]?.data?.links?.[0],
    EXAMPLE_SIGNED_TERMS_PDF_URL,
  );
});
