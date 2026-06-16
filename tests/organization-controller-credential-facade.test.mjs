import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ActivationCredentialTypes,
} from '../../gdc-common-utils-ts/dist/index.js';

import {
  IcaCredentialFormats,
  createOrganizationControllerCredentialFacade,
} from '../dist/index.js';

test('organization controller credential facade builds direct ICA retrieve URLs without TAX prefix', () => {
  const facade = createOrganizationControllerCredentialFacade({
    fetcher: async () => {
      throw new Error('fetch should not be called while building URLs');
    },
  });

  const organizationUrl = facade.buildOrganizationCredentialRetrieveUrl({
    icaBaseUrl: 'http://34.175.75.120',
    route: {
      jurisdiction: 'ES',
      network: 'health-care',
    },
    identifier: 'TAX|VATES-B02652741',
  });

  const legalRepresentativeUrl = facade.buildLegalRepresentativeCredentialRetrieveUrl({
    icaBaseUrl: 'http://34.175.75.120/ica',
    route: {
      jurisdiction: 'ES',
      network: 'health-care',
    },
    identifier: 'VATES-B02652741',
  });

  assert.equal(
    organizationUrl,
    'http://34.175.75.120/ica/cds-ES/v1/health-care/network/credentials/contract/_retrieve?type=OrganizationCredential&format=vc%2Bjson&version=v2&identifier=VATES-B02652741',
  );
  assert.equal(
    legalRepresentativeUrl,
    'http://34.175.75.120/ica/cds-ES/v1/health-care/network/credentials/contract/_retrieve?type=LegalRepresentativeCredential&format=vc%2Bjson&version=v2&identifier=VATES-B02652741',
  );
});

test('organization controller credential facade downloads both controller-owned ICA credentials step by step', async () => {
  const calls = [];
  const facade = createOrganizationControllerCredentialFacade({
    fetcher: async (url, init) => {
      calls.push({ url, init });
      const parsed = new URL(url);
      const type = parsed.searchParams.get('type');

      return {
        ok: true,
        status: 200,
        headers: {
          get() {
            return 'application/vc+json';
          },
        },
        async json() {
          return {
            id: `urn:vc:${type}`,
            type: ['VerifiableCredential', type],
            credentialSubject: {
              identifier: parsed.searchParams.get('identifier'),
            },
          };
        },
      };
    },
  });

  const result = await facade.retrieveControllerCredentials({
    icaBaseUrl: 'http://34.175.75.120',
    route: {
      jurisdiction: 'ES',
      network: 'health-care',
      tenantId: 'ica',
    },
    identifier: 'VATES-B02652741',
    format: IcaCredentialFormats.VcJson,
  });

  assert.equal(calls.length, 2);
  assert.equal(
    new URL(calls[0].url).searchParams.get('type'),
    ActivationCredentialTypes.OrganizationCredential,
  );
  assert.equal(
    new URL(calls[1].url).searchParams.get('type'),
    ActivationCredentialTypes.LegalRepresentativeCredential,
  );
  assert.equal(calls[0].init.method, 'GET');
  assert.equal(calls[0].init.headers.accept, 'application/vc+json');
  assert.equal(result.organizationCredential.credentialSubject.identifier, 'VATES-B02652741');
  assert.equal(result.legalRepresentativeCredential.credentialSubject.identifier, 'VATES-B02652741');
});
