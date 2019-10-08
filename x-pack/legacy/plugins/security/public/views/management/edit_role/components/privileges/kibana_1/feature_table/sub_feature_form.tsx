/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, ChangeEvent, ReactNode } from 'react';
import {
  EuiText,
  EuiFlexItem,
  EuiCard,
  EuiSwitch,
  EuiFlexGrid,
  EuiCheckbox,
  EuiToolTip,
} from '@elastic/eui';
import { POCPrivilegeCalculator } from 'plugins/security/lib/poc_privilege_calculator/poc_privilege_calculator';
import { Role } from '../../../../../../../../common/model';
import { Feature } from '../../../../../../../../../../../plugins/features/server';

interface Props {
  feature: Feature;
  privilegeCalculator: POCPrivilegeCalculator;
  role: Role;
  spacesIndex: number;
  disabled?: boolean;
  onChange: (featureId: string, featurePrivileges: string[]) => void;
}
export const SubFeatureForm = ({
  feature,
  role,
  spacesIndex,
  privilegeCalculator,
  onChange,
  disabled,
}: Props) => {
  const effectivePrivileges = privilegeCalculator.getEffectiveFeaturePrivileges(
    role.kibana,
    role.kibana[spacesIndex].spaces,
    feature.id
  );

  const onPrivilegeChange = (privilegeId: string, e: ChangeEvent<HTMLInputElement>) => {
    let assignedPrivileges = [...(role.kibana[spacesIndex].feature[feature.id] || [])];
    if (e.target.checked) {
      assignedPrivileges.push(privilegeId);
    } else {
      assignedPrivileges = assignedPrivileges.filter(ap => ap !== privilegeId);
    }

    onChange(feature.id, assignedPrivileges);
  };

  const items = feature.privileges.custom
    ? feature.privileges.custom.map(category => {
        return {
          title: category.categoryName,
          features: category.privileges.map(categoryPrivilege => {
            const canToggle = privilegeCalculator.canToggleFeaturePrivilege(
              role.kibana,
              role.kibana[spacesIndex].spaces,
              feature.id,
              categoryPrivilege.id
            );

            let title: ReactNode = categoryPrivilege.name;

            if (!canToggle) {
              const resp = privilegeCalculator.explainEffectiveFeaturePrivilege(
                role.kibana,
                role.kibana[spacesIndex].spaces,
                feature.id,
                categoryPrivilege.id
              );

              title = (
                <EuiToolTip
                  content={<pre>{JSON.stringify(resp, null, 2)}</pre>}
                  title={'Privilege auto-selected'}
                >
                  <span style={{ borderBottom: '1px dotted blue' }}>{categoryPrivilege.name}</span>
                </EuiToolTip>
              );
            }

            return {
              feature: categoryPrivilege.id,
              title,
              checked: effectivePrivileges.includes(categoryPrivilege.id),
              disabled: !canToggle || disabled,
            };
          }),
        };
      })
    : [];

  return (
    <Fragment>
      <EuiFlexGrid style={{ width: '100%' }} gutterSize="s">
        {items.map(item => {
          return (
            <EuiFlexItem key={item.title} grow={1} style={{ width: '40%' }}>
              <EuiCard
                textAlign="left"
                title={
                  item.features ? (
                    <EuiText size="s" style={{ fontWeight: 500 }}>
                      {item.title}
                    </EuiText>
                  ) : (
                    <EuiSwitch compressed label={item.title} />
                  )
                }
                description={
                  item.features && (
                    <div>
                      {item.features.map(subFeature => (
                        <EuiCheckbox
                          id={subFeature.feature}
                          label={subFeature.title}
                          disabled={subFeature.disabled}
                          onChange={e => onPrivilegeChange(subFeature.feature, e)}
                          checked={subFeature.checked}
                        />
                      ))}
                    </div>
                  )
                }
              ></EuiCard>
            </EuiFlexItem>
          );
        })}
      </EuiFlexGrid>
    </Fragment>
  );
};
