/**
 * Canonical coded-clinical-resource authoring and display boundary.
 *
 * `CodeableConcept.text` is the manually authored label in the resource
 * language. `Coding.display` is the English/international label.
 * `system|code` remains a terminology identity and translation key; consumers
 * must never copy it into a user-editable name field.
 */
export { BundleEditor } from 'gdc-common-utils-ts/utils/bundle-editor-core';
export {
  BundleEditableResourceTypes,
  BundleOperations,
} from 'gdc-common-utils-ts/models/bundle-editor-types';
export {
  AllergyIntoleranceClaim,
} from 'gdc-common-utils-ts/models/interoperable-claims/allergy-intolerance-claims';
export {
  ConditionClaim,
} from 'gdc-common-utils-ts/models/interoperable-claims/condition-claims';
export {
  DiagnosticReportClaim,
} from 'gdc-common-utils-ts/models/interoperable-claims/diagnostic-report-claims';
export {
  FlagClaim,
} from 'gdc-common-utils-ts/models/interoperable-claims/flag-claims';
export {
  MedicationStatementClaim,
} from 'gdc-common-utils-ts/models/interoperable-claims/medication-statement-claims';
export {
  toClinicalResourceCardView,
  toClinicalResourceCardViews,
  toClinicalResourceCommonView,
  toClinicalResourceCommonViews,
  toClinicalSectionViews,
  type ClinicalResourceDisplayOptions,
  type ClinicalTerminologyTranslationInput,
} from 'gdc-common-utils-ts/utils/clinical-resource-view';

// Register the typed `BundleEditor.asResourceType(...)` surfaces.
import 'gdc-common-utils-ts/utils/allergy-intolerance-entry-editor';
import 'gdc-common-utils-ts/utils/condition-entry-editor';
import 'gdc-common-utils-ts/utils/diagnostic-report-entry-editor';
import 'gdc-common-utils-ts/utils/flag-entry-editor';
import 'gdc-common-utils-ts/utils/medication-statement-entry-editor';
