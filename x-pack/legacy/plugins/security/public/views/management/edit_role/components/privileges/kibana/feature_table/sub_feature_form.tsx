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
import { FeatureViewModel } from '../../../../../../../../../../../plugins/features/public/types';
import { FeatureKibanaPrivileges } from '../../../../../../../../../../../plugins/features/server/feature_kibana_privileges';
import { Role } from '../../../../../../../../common/model';

interface Props {
  feature: FeatureViewModel;
  role: Role;
  spacesIndex: number;
  disabled?: boolean;
  onChange: (featureId: string, featurePrivileges: string[]) => void;
}

function* recFeaturePrivileges(
  g: KibanaFeaturePrivilegeGroup
): Generator<[KibanaFeaturePrivilegeGroup, FeatureKibanaPrivileges]> {
  for (const p of g.privileges) {
    yield [g, p];
  }
  if (g.privilegeGroups) {
    for (const g2 of g.privilegeGroups) {
      yield* recFeaturePrivileges(g2);
    }
  }
}

export const SubFeatureForm = ({ feature, role, spacesIndex, onChange, disabled }: Props) => {
  const onPrivilegeChange = (privilegeId: string, e: ChangeEvent<HTMLInputElement>) => {
    let assignedPrivileges = [...(role.kibana[spacesIndex].feature[feature.id] || [])];
    if (e.target.checked) {
      assignedPrivileges.push(privilegeId);
    } else {
      assignedPrivileges = assignedPrivileges.filter(ap => ap !== privilegeId);
    }

    onChange(feature.id, assignedPrivileges);
  };

  const items = feature.privileges.optional;

  return (
    <Fragment>
      <EuiFlexGrid style={{ width: '100%' }} gutterSize="s">
        {items.map(item => {
          return (
            <EuiFlexItem key={item.name} grow={1} style={{ width: '40%' }}>
              <EuiCard
                textAlign="left"
                title={
                  <EuiText size="s" style={{ fontWeight: 500 }}>
                    {item.name}
                  </EuiText>
                }
                description={
                  <div>
                    {item.privileges.map(ip => {
                      return (
                        <EuiCheckbox
                          id={ip.id}
                          key={ip.id}
                          label={ip.name}
                          onChange={e => onPrivilegeChange(ip.id, e)}
                        />
                      );
                    })}
                  </div>
                }
              ></EuiCard>
            </EuiFlexItem>
          );
        })}
      </EuiFlexGrid>
    </Fragment>
  );
};
