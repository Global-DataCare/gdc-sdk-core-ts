import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AllergyIntoleranceClaim,
  BundleEditableResourceTypes,
  BundleEditor,
  BundleOperations,
  toClinicalResourceCardView,
  toClinicalSectionViews,
} from '../dist/index.js';

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
