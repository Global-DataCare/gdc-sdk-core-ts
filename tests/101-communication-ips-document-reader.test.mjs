import test from 'node:test';
import assert from 'node:assert/strict';

import { HealthcareBasicSections } from '../../gdc-common-utils-ts/dist/constants/healthcare.js';
import { ResourceTypesFhirR4 } from '../../gdc-common-utils-ts/dist/constants/fhir-resource-types.js';
import {
  EXAMPLE_CONDITION_CODE,
  EXAMPLE_CONDITION_IDENTIFIER,
  EXAMPLE_OBSERVATION_IDENTIFIER,
  EXAMPLE_SUBJECT_DID,
  EXAMPLE_VAULT_CONDITION_DATE_TIME,
} from '../../gdc-common-utils-ts/dist/examples/shared.js';
import {
  EXAMPLE_VITAL_SIGN_HEART_RATE_INPUT,
  buildVitalSignObservationEntry,
} from '../../gdc-common-utils-ts/dist/examples/vital-signs.js';
import { ConditionClaim } from '../../gdc-common-utils-ts/dist/models/interoperable-claims/condition-claims.js';
import { ObservationClaim } from '../../gdc-common-utils-ts/dist/models/interoperable-claims/observation-claims.js';
import { toClinicalResourceExpandedView } from '../../gdc-common-utils-ts/dist/utils/clinical-resource-view.js';

import {
  addFhirResourceToCommunication,
  createCommunicationFacade,
  createCommunicationResource,
} from '../dist/index.js';

function buildIpsBundleFixture() {
  const heartRateEntry = buildVitalSignObservationEntry({
    ...EXAMPLE_VITAL_SIGN_HEART_RATE_INPUT,
    identifier: EXAMPLE_OBSERVATION_IDENTIFIER,
  });

  return {
    resourceType: ResourceTypesFhirR4.Bundle,
    type: 'document',
    entry: [
      {
        fullUrl: 'urn:uuid:ips-composition-001',
        resource: {
          resourceType: ResourceTypesFhirR4.Composition,
          id: 'ips-composition-001',
          title: 'International Patient Summary',
          section: [
            {
              title: 'Problem List',
              code: {
                coding: [{ system: 'http://loinc.org', code: '11450-4' }],
              },
              entry: [{ reference: `Condition/${EXAMPLE_CONDITION_IDENTIFIER}` }],
            },
            {
              title: 'Allergies and Intolerances',
              code: {
                coding: [{ system: 'http://loinc.org', code: '48765-2' }],
              },
              entry: [{ reference: 'AllergyIntolerance/allergy-example-001' }],
            },
            {
              title: 'Vital Signs',
              code: {
                coding: [{ system: 'http://loinc.org', code: '8716-3' }],
              },
              entry: [{ reference: heartRateEntry.fullUrl }],
            },
          ],
        },
      },
      {
        fullUrl: `urn:uuid:${EXAMPLE_CONDITION_IDENTIFIER}`,
        resource: {
          resourceType: ResourceTypesFhirR4.Condition,
          id: EXAMPLE_CONDITION_IDENTIFIER,
          onsetDateTime: EXAMPLE_VAULT_CONDITION_DATE_TIME,
          code: {
            coding: [{ system: 'http://snomed.info/sct', code: '44054006' }],
            text: 'Diabetes mellitus type 2',
          },
          text: {
            status: 'generated',
            div: '<div><p>Type 2 diabetes mellitus, active.</p></div>',
          },
          meta: {
            claims: {
              [ConditionClaim.Identifier]: EXAMPLE_CONDITION_IDENTIFIER,
              [ConditionClaim.Subject]: EXAMPLE_SUBJECT_DID,
              [ConditionClaim.Code]: EXAMPLE_CONDITION_CODE,
              [ConditionClaim.ClinicalStatus]: 'active',
              [ConditionClaim.Severity]: 'http://snomed.info/sct|24484000',
              [ConditionClaim.OnsetDateTime]: EXAMPLE_VAULT_CONDITION_DATE_TIME,
            },
          },
        },
      },
      {
        fullUrl: 'urn:uuid:allergy-example-001',
        resource: {
          resourceType: ResourceTypesFhirR4.AllergyIntolerance,
          id: 'allergy-example-001',
          onsetDateTime: '2026-05-01T09:00:00Z',
          meta: {
            claims: {
              'AllergyIntolerance.identifier': 'allergy-example-001',
              'AllergyIntolerance.subject': EXAMPLE_SUBJECT_DID,
              'AllergyIntolerance.code': 'http://snomed.info/sct|227493005',
              'AllergyIntolerance.criticality': 'high',
            },
          },
        },
      },
      heartRateEntry,
    ],
  };
}

test('101: IPS bundle facade reads sections, resources, dates, and resource claims step by step', () => {
  // Step 1.
  // The app already has one IPS-like FHIR Bundle document with canonical
  // section codes plus resource-level `meta.claims`.
  const bundle = buildIpsBundleFixture();

  // Step 2.
  // sdk-core wraps the bundle inside a Communication payload, which is how the
  // same document may travel through inbox/outbox flows.
  const communication = addFhirResourceToCommunication(
    createCommunicationResource({
      subject: EXAMPLE_SUBJECT_DID,
    }),
    bundle,
    {
      asDocumentReference: true,
      attachmentTitle: 'ips.json',
    },
  );

  // Step 3.
  // The consumer opens the high-level Communication facade and resolves the
  // embedded FHIR document without caring about attachment plumbing.
  const sdkCommunication = createCommunicationFacade();
  const fhirDocument = sdkCommunication.getFhirDocument(communication);

  // Step 4.
  // Section browsing:
  // - get the IPS section codes
  // - count linked resources per section
  const sections = fhirDocument.getSections();
  assert.equal(sections.length, 3);
  assert.deepEqual(
    sections.map((section) => section.code),
    [
      HealthcareBasicSections.ProblemList.claim,
      HealthcareBasicSections.AllergiesAndIntolerances.claim,
      HealthcareBasicSections.VitalSigns.claim,
    ],
  );
  assert.deepEqual(
    sections.map((section) => section.entries.length),
    [1, 1, 1],
  );

  // Step 5.
  // Read one section directly as resources instead of manually resolving
  // `Composition.section[].entry[]` references.
  const problemListResources = fhirDocument.getSectionResources(
    HealthcareBasicSections.ProblemList.claim,
    ResourceTypesFhirR4.Condition,
  );
  const vitalSignsResources = fhirDocument.getSectionResources(
    HealthcareBasicSections.VitalSigns.claim,
    ResourceTypesFhirR4.Observation,
  );
  assert.equal(problemListResources.length, 1);
  assert.equal(vitalSignsResources.length, 1);

  // Step 6.
  // Date filtering still works over the same document.
  const observationsOnDate = fhirDocument.getByDates(
    ResourceTypesFhirR4.Observation,
    '2026-06-11T00:00:00Z',
    '2026-06-11T23:59:59Z',
  );
  assert.equal(observationsOnDate.length, 1);
  assert.equal(
    observationsOnDate[0].meta?.claims?.[ObservationClaim.Identifier],
    EXAMPLE_OBSERVATION_IDENTIFIER,
  );

  // Step 7.
  // The consumer can open `resource.meta.claims` on each resource and then use
  // the canonical claim keys/helpers from gdc-common-utils-ts.
  const conditionClaims = problemListResources[0].meta?.claims;
  const observationClaims = vitalSignsResources[0].meta?.claims;
  assert.equal(conditionClaims?.[ConditionClaim.OnsetDateTime], EXAMPLE_VAULT_CONDITION_DATE_TIME);
  assert.equal(conditionClaims?.[ConditionClaim.Severity], 'http://snomed.info/sct|24484000');
  assert.equal(observationClaims?.[ObservationClaim.Date], '2026-06-11T08:30:00Z');
  assert.equal(observationClaims?.[ObservationClaim.CodeText], 'Heart rate');

  // Step 8.
  // When one resource already carries narrative XHTML, the shared clinical view
  // helper can project it directly from the same bundle entry.
  const conditionEntry = bundle.entry.find((entry) => entry.resource?.id === EXAMPLE_CONDITION_IDENTIFIER);
  assert.ok(conditionEntry);
  const conditionView = toClinicalResourceExpandedView(conditionEntry);
  assert.equal(conditionView.xhtml, '<div><p>Type 2 diabetes mellitus, active.</p></div>');

  // Step 9.
  // Higher-level section-aware summary and resource filtering can now stay on
  // the document facade.
  const sectionSummary = fhirDocument.getSectionSummary();
  assert.equal(sectionSummary.totalResources, 3);
  assert.equal(sectionSummary.countsBySection[HealthcareBasicSections.ProblemList.claim], 1);
  assert.equal(sectionSummary.countsBySection[HealthcareBasicSections.AllergiesAndIntolerances.claim], 1);
  assert.equal(sectionSummary.countsBySection[HealthcareBasicSections.VitalSigns.claim], 1);
  assert.equal(sectionSummary.countsByResourceType[ResourceTypesFhirR4.Condition], 1);
  assert.equal(sectionSummary.countsByResourceType[ResourceTypesFhirR4.AllergyIntolerance], 1);
  assert.equal(sectionSummary.countsByResourceType[ResourceTypesFhirR4.Observation], 1);

  // Step 10.
  // The same facade can return family-specific filtered lists, with section
  // scope and pagination semantics.
  const allergies = fhirDocument.getAllergies({
    sections: [HealthcareBasicSections.AllergiesAndIntolerances.claim],
    criticality: ['high'],
    count: 1,
    page: 1,
  });
  const conditions = fhirDocument.getConditions({
    sections: [HealthcareBasicSections.ProblemList.claim],
    clinicalStatus: ['active'],
    count: 1,
    page: 1,
  });
  const vitalSigns = fhirDocument.getVitalSigns({
    sections: [HealthcareBasicSections.VitalSigns.claim],
    count: 1,
    page: 1,
  });

  assert.equal(allergies.length, 1);
  assert.equal(allergies[0].id, 'allergy-example-001');
  assert.equal(conditions.length, 1);
  assert.equal(conditions[0].id, EXAMPLE_CONDITION_IDENTIFIER);
  assert.equal(vitalSigns.length, 1);
  assert.equal(vitalSigns[0].meta?.claims?.[ObservationClaim.Identifier], EXAMPLE_OBSERVATION_IDENTIFIER);

  // Step 11.
  // Narrative and combined local/international labels can be resolved even when
  // a resource only carries `meta.claims`.
  const allergyNarrative = fhirDocument.getNarrative(allergies[0]);
  assert.equal(allergyNarrative.source, 'derived-from-claims');
  assert.match(allergyNarrative.xhtml || '', /Criticality: high/);

  const vitalLabels = fhirDocument.getLocalTextAndIntDisplay(vitalSigns[0]);
  assert.equal(vitalLabels.localText, 'Heart rate');
  assert.equal(vitalLabels.internationalDisplay, 'Heart rate');
});
