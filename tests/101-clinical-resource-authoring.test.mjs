/**
 * Flow contract: SDK Core exposes the runtime-neutral typed clinical batch
 * authoring API from Common Utils. One batch may create and delete independent
 * resources without raw FHIR request literals; transport and GW execution stay
 * outside this layer.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AllergyIntoleranceClaim,
  BundleEditableResourceTypes,
  BundleEditor,
  BundleOperations,
  BundleTypes,
  HttpRequestMethods,
  LocalTerminologyProvider,
  createClinicalCodeTranslator,
  toClinicalResourceCardView,
  toClinicalSectionViews,
} from '../dist/index.js';

test('SDK root authors mixed clinical batch operations through entry methods', () => {
  const createdAllergyId = 'allergy-sdk-core-create-001';
  const allergyId = 'allergy-sdk-core-001';
  const allergyVersionId = 'zSdkCoreClinicalVersion001';
  const batch = new BundleEditor().setBundleType(BundleTypes.batch);

  batch
    .newEntryAs(BundleEditableResourceTypes.allergyIntolerance, createdAllergyId)
    .create();
  batch
    .newEntryAs(BundleEditableResourceTypes.allergyIntolerance, allergyId)
    .delete()
    .ifMatch(allergyVersionId);

  const built = batch.build();
  assert.equal(built.entry[0].request.method, HttpRequestMethods.Post);
  assert.equal(built.entry[1].request.method, HttpRequestMethods.Delete);
  assert.equal(built.entry[1].resource, undefined);
});

test('SDK root keeps manual CodeableConcept text separate from system|code', () => {
  const token = 'http://snomed.info/sct|373270004';
  const entry = new BundleEditor()
    .setBundleOperation(BundleOperations.create)
    .setAllowedResourceType(BundleEditableResourceTypes.allergyIntolerance)
    .newEntryAs(BundleEditableResourceTypes.allergyIntolerance, 'urn:uuid:penicillin')
    .setIdentifier('urn:uuid:penicillin')
    .setSubject('did:web:example.test:patient')
    .setLanguage('es')
    .setCode(token)
    .setCodeTextLocal('Penicilina')
    .setCodeDisplay('Penicillin')
    .doneEntry()
    .build()
    .entry[0];
  const claims = entry.resource.meta.claims;

  assert.equal(claims[AllergyIntoleranceClaim.Code], token);
  assert.equal(claims[AllergyIntoleranceClaim.CodeText], 'Penicilina');
  assert.equal(claims[AllergyIntoleranceClaim.CodeDisplay], 'Penicillin');
  assert.equal(claims['AllergyIntolerance.language'], 'es');
  assert.equal(toClinicalResourceCardView(entry, { locale: 'es-ES' }).title, 'Penicilina');
  assert.notEqual(toClinicalResourceCardView(entry, { locale: 'es-ES' }).title, token);
});

test('SDK root returns every Composition section with locale-aware cards', () => {
  const bundle = {
    resourceType: 'Bundle',
    type: 'document',
    entry: [{
      resource: {
        resourceType: 'Composition',
        section: [{
          title: 'Allergies',
          entry: [{ reference: 'AllergyIntolerance/penicillin' }],
        }],
      },
    }, {
      fullUrl: 'AllergyIntolerance/penicillin',
      resource: {
        resourceType: 'AllergyIntolerance',
        language: 'es',
        code: {
          text: 'Penicilina',
          coding: [{
            system: 'http://snomed.info/sct',
            code: '373270004',
            display: 'Penicillin',
          }],
        },
      },
    }],
  };

  const sections = toClinicalSectionViews(bundle, { locale: 'en' });
  assert.equal(sections.length, 1);
  assert.equal(sections[0].resources[0].title, 'Penicillin');
});

test('SDK root exposes the local terminology fallback used by every runtime', () => {
  const terminology = new LocalTerminologyProvider([{
    language: 'es',
    data: [{
      id: 'http://snomed.info/sct',
      attributes: { '373270004': 'Penicilina' },
    }],
  }]);

  const translateCode = createClinicalCodeTranslator(terminology);
  assert.equal(translateCode({
    resourceType: 'AllergyIntolerance',
    system: 'http://snomed.info/sct',
    code: '373270004',
    token: 'http://snomed.info/sct|373270004',
    locale: 'es',
  }), 'Penicilina');
});
