/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { RoleMapping } from '../../../../../../common/model';
import { generateRulesFromRaw } from '../../model';

interface ValidationResult {
  isInvalid: boolean;
  error?: string;
}

export function validateRoleMappingName({ name }: RoleMapping): ValidationResult {
  if (!name) {
    return invalid(
      i18n.translate('xpack.security.role_mappings.validation.invalidName', {
        defaultMessage: 'Name is required.',
      })
    );
  }
  return valid();
}

export function validateRoleMappingRoles({ roles }: RoleMapping): ValidationResult {
  if (roles && !roles.length) {
    return invalid(
      i18n.translate('xpack.security.role_mappings.validation.invalidRoles', {
        defaultMessage: 'At least one role is required.',
      })
    );
  }
  return valid();
}

export function validateRoleMappingRoleTemplates({
  role_templates: roleTemplates,
}: RoleMapping): ValidationResult {
  if (roleTemplates && !roleTemplates.length) {
    return invalid(
      i18n.translate('xpack.security.role_mappings.validation.invalidRoleTemplates', {
        defaultMessage: 'At least one role template is required.',
      })
    );
  }
  return valid();
}

export function validateRoleMappingRules({ rules }: RoleMapping): ValidationResult {
  try {
    const parsedRule = generateRulesFromRaw(rules);
    if (!parsedRule) {
      return invalid(
        i18n.translate('xpack.security.role_mappings.validation.invalidRoleRule', {
          defaultMessage: 'At least one rule is required.',
        })
      );
    }
  } catch (e) {
    return invalid(e.message);
  }

  return valid();
}

export function validateRoleMappingForSave(roleMapping: RoleMapping): ValidationResult {
  const { isInvalid: isNameInvalid } = validateRoleMappingName(roleMapping);
  const { isInvalid: areRolesInvalid } = validateRoleMappingRoles(roleMapping);
  const { isInvalid: areRoleTemplatesInvalid } = validateRoleMappingRoleTemplates(roleMapping);
  const { isInvalid: areRulesInvalid } = validateRoleMappingRules(roleMapping);

  const canSave =
    !isNameInvalid && (!areRolesInvalid || !areRoleTemplatesInvalid) && !areRulesInvalid;

  if (canSave) {
    return valid();
  }
  return invalid();
}

function valid() {
  return { isInvalid: false };
}

function invalid(error?: string) {
  return { isInvalid: true, error };
}
