/**
 * Employee test fixtures shared by docs-oriented tests.
 *
 * Source-of-truth rule:
 * - synthetic employee identities come from `gdc-common-utils-ts/examples`
 * - claim keys come from shared schema constants
 * - test files should only compose scenarios from these exports
 */
import {
  EXAMPLE_EMPLOYEE_CONTROLLER_ACTIVE,
  EXAMPLE_EMPLOYEE_DOCTOR_ACTIVE,
  EXAMPLE_EMPLOYEE_DOCTOR_PURGED_HISTORICAL,
} from 'gdc-common-utils-ts/examples/employee';
import { EXAMPLE_ACTIVATE_ORGANIZATION_FROM_ICA_PROOF_INPUT } from 'gdc-common-utils-ts/examples/organization-controller';
import {
  EXAMPLE_API_ORGANIZATION_DID,
  EXAMPLE_PROVIDER_ORGANIZATION_DID,
} from 'gdc-common-utils-ts/examples/shared';
import { ClaimsOrganizationSchemaorg, ClaimsPersonSchemaorg } from 'gdc-common-utils-ts/constants/schemaorg';
import {
  EmployeeBatchEntryTypes as SharedEmployeeBatchEntryTypes,
  EmployeeBundleMethods as SharedEmployeeBundleMethods,
  EmployeeBundleOperations as SharedEmployeeBundleOperations,
  EmployeeBundleRoutes as SharedEmployeeBundleRoutes,
  EmployeeResourceTypes as SharedEmployeeResourceTypes,
} from 'gdc-common-utils-ts/utils/employee';

export const EmployeeClaimKeys = Object.freeze({
  context: '@context',
  identifier: ClaimsPersonSchemaorg.identifier,
  email: ClaimsPersonSchemaorg.email,
  role: ClaimsPersonSchemaorg.hasOccupationalRoleValue,
  memberOf: ClaimsPersonSchemaorg.memberOf,
  memberOfOrgTaxId: ClaimsPersonSchemaorg.memberOfOrgTaxId,
});

export const EmployeeBundleMethods = SharedEmployeeBundleMethods;
export const EmployeeBundleRoutes = SharedEmployeeBundleRoutes;
export const EmployeeBatchEntryTypes = SharedEmployeeBatchEntryTypes;
export const EmployeeBundleOperations = SharedEmployeeBundleOperations;
export const EmployeeResourceTypes = SharedEmployeeResourceTypes;

export const EmployeeSearchResourceType = SharedEmployeeResourceTypes;

export const ExampleEmployeeDirectory = Object.freeze({
  controllerActive: EXAMPLE_EMPLOYEE_CONTROLLER_ACTIVE,
  doctorActive: EXAMPLE_EMPLOYEE_DOCTOR_ACTIVE,
  doctorPurgedHistorical: EXAMPLE_EMPLOYEE_DOCTOR_PURGED_HISTORICAL,
});

export const ExampleEmployeeAffiliations = Object.freeze({
  primary: EXAMPLE_PROVIDER_ORGANIZATION_DID,
  secondary: EXAMPLE_API_ORGANIZATION_DID,
});

export const ExampleEmployeeOrganization = Object.freeze({
  taxId: EXAMPLE_ACTIVATE_ORGANIZATION_FROM_ICA_PROOF_INPUT.additionalClaims[ClaimsOrganizationSchemaorg.taxId],
});

export function createDoctorRoleBundleEditorInput() {
  return Object.freeze({
    identifier: ExampleEmployeeDirectory.doctorPurgedHistorical.identifier,
    email: ExampleEmployeeDirectory.doctorActive.email,
    role: ExampleEmployeeDirectory.doctorActive.role,
    memberOf: [
      ExampleEmployeeAffiliations.primary,
      ExampleEmployeeAffiliations.secondary,
    ],
  });
}

export function createSharedProfessionalRoleComparisonInput() {
  return Object.freeze({
    sharedEmail: ExampleEmployeeDirectory.controllerActive.email,
    controllerRole: ExampleEmployeeDirectory.controllerActive.role,
    doctorRole: ExampleEmployeeDirectory.doctorActive.role,
  });
}
