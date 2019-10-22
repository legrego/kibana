/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiText, EuiIcon, EuiComboBox } from '@elastic/eui';
import { FeatureViewModel } from '../../../../../../../../../../../plugins/features/public/types';

interface Props {
  feature: FeatureViewModel;
  inheritedPrivileges?: string[];
  effectivePrivileges: string[];
  selectedPrivileges: string[];
  onChange: (privileges: string[]) => void;
}

export const PrivilegeCombobox = (props: Props) => {
  const { feature, effectivePrivileges, inheritedPrivileges = [] } = props;
  const { required, optional } = feature.privileges;
  const requiredGroup = {
    label: feature.name,
    options: required.map(rp => {
      return {
        id: rp.id,
        label: rp.name,
        disabled: effectivePrivileges.includes(rp.id),
      };
    }),
  };

  const onChange = (options: Array<{ id?: string }>) => {
    const assignedPrivileges = options.map(o => o.id) as string[];
    if (!hasAnyRequiredAssignedPrivileges(assignedPrivileges)) {
      // unset all optional privileges if no required privileges are present
      props.onChange([]);
    } else {
      props.onChange(options.map(o => o.id!));
    }
  };

  const hasAnyRequiredAssignedPrivileges = (assignedPrivileges: string[]) => {
    return assignedPrivileges.some(afp => requiredGroup.options.some(ro => ro.id === afp));
  };

  const enableOptionalPrivileges = hasAnyRequiredAssignedPrivileges(props.selectedPrivileges);
  const optionalGroups = optional.map(o => {
    return {
      label: o.name,
      options: o.privileges.map(op => {
        const isInherited = effectivePrivileges.includes(op.id);
        return {
          id: op.id,
          label: `${o.name} ${op.name}`,
          isInherited,
          displayLabel: op.name,
          disabled: !enableOptionalPrivileges || isInherited,
        };
      }),
    };
  });

  const selectedOptions = [requiredGroup.options, optionalGroups.map(og => og.options)]
    .flat(2)
    .filter(o => props.selectedPrivileges.includes(o.id));

  return (
    <EuiComboBox
      options={[requiredGroup, ...optionalGroups]}
      onChange={onChange}
      selectedOptions={selectedOptions}
      renderOption={option => {
        const labelText = option.displayLabel || option.label;
        if (option.isInherited) {
          return (
            <span>
              <EuiIcon size="s" type="check" /> {labelText}
            </span>
          );
        }
        return labelText;
      }}
    />
  );
};
