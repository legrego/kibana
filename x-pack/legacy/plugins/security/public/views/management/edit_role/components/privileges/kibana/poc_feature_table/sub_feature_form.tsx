/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiCheckbox, EuiButtonGroup } from '@elastic/eui';
import { PrivilegeExplanation } from '../../../../../../../../../../../plugins/security/common/model/poc_kibana_privileges/privilege_explanation';
import { FeatureKibanaPrivilegesGroup } from '../../../../../../../../../../../plugins/features/common/feature_kibana_privileges';
import { ISubFeature } from '../../../../../../../../../../../plugins/features/common';
import { NO_PRIVILEGE_VALUE } from '../../../../lib/constants';

interface Props {
  subFeature: ISubFeature;
  selectedPrivileges: string[];
  privilegeExplanations: { [privilegeId: string]: PrivilegeExplanation };
  onChange: (selectedPrivileges: string[]) => void;
  disabled?: boolean;
}

export const SubFeatureForm = (props: Props) => {
  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiText size="s">{props.subFeature.name}</EuiText>
      </EuiFlexItem>
      <EuiFlexItem>{props.subFeature.privilegeGroups.map(renderPrivilegeGroup)}</EuiFlexItem>
    </EuiFlexGroup>
  );

  function renderPrivilegeGroup(privilegeGroup: FeatureKibanaPrivilegesGroup) {
    switch (privilegeGroup.groupType) {
      case 'independent':
        return renderIndependentPrivilegeGroup(privilegeGroup);
      case 'mutually_exclusive':
        return renderMutuallyExclusivePrivilegeGroup(privilegeGroup);
      default:
        throw new Error(`Unsupported privilege group type: ${privilegeGroup.groupType}`);
    }
  }

  function renderIndependentPrivilegeGroup(privilegeGroup: FeatureKibanaPrivilegesGroup) {
    return (
      <div>
        {privilegeGroup.privileges.map(privilege => {
          const isSelected = props.privilegeExplanations[privilege.id].isGranted();
          const isInherited = props.privilegeExplanations[privilege.id].isInherited();
          return (
            <EuiCheckbox
              key={privilege.id}
              id={privilege.id}
              label={privilege.name}
              onChange={e => {
                const { checked } = e.target;
                if (checked) {
                  props.onChange([...props.selectedPrivileges, privilege.id]);
                } else {
                  props.onChange(props.selectedPrivileges.filter(sp => sp !== privilege.id));
                }
              }}
              checked={isSelected}
              disabled={isInherited || props.disabled}
              compressed={true}
            />
          );
        })}
      </div>
    );
  }
  function renderMutuallyExclusivePrivilegeGroup(privilegeGroup: FeatureKibanaPrivilegesGroup) {
    const firstSelectedPrivilege = privilegeGroup.privileges.find(p =>
      props.privilegeExplanations[p.id].isGranted()
    );
    const isInherited =
      firstSelectedPrivilege &&
      props.privilegeExplanations[firstSelectedPrivilege.id].isInherited();

    const options = [
      privilegeGroup.privileges.map(privilege => {
        return {
          id: privilege.id,
          label: privilege.name,
        };
      }),
      {
        id: NO_PRIVILEGE_VALUE,
        label: 'None',
      },
    ].flat();

    return (
      <EuiButtonGroup
        buttonSize="compressed"
        options={options}
        idSelected={firstSelectedPrivilege?.id ?? NO_PRIVILEGE_VALUE}
        isDisabled={props.disabled || isInherited}
        onChange={selectedPrivilegeId => {
          // Deselect all privileges which belong to this mutually-exclusive group
          const privilegesWithoutGroupEntries = props.selectedPrivileges.filter(
            sp => !privilegeGroup.privileges.some(privilege => privilege.id === sp)
          );
          // fire on-change with the newly selected privilege
          props.onChange([...privilegesWithoutGroupEntries, selectedPrivilegeId]);
        }}
      />
    );
  }
};
