/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, Fragment, ChangeEvent } from 'react';
import { EuiText, EuiFlexItem, EuiCard, EuiSwitch, EuiFlexGrid, EuiCheckbox } from '@elastic/eui';
import { POCPrivilegeCalculator } from 'plugins/security/lib/poc_privilege_calculator/poc_privilege_calculator';
import { Role } from '../../../../../../../../common/model';
import { Feature } from '../../../../../../../../../../../plugins/features/server';

interface SubFeature {
  feature: string;
  title: string;
  checked?: boolean;
  disabled?: boolean;
  features?: SubFeature[];
}

const featureSubFeatureDemoMap: Record<string, SubFeature[]> = {
  discover: [
    {
      feature: 'general',
      title: 'General',
      features: [
        {
          feature: 'general.access',
          title: 'Access application',
          checked: true,
          disabled: true,
        },
        {
          feature: 'general.saveSearch',
          title: 'Create saved searches',
        },
        {
          feature: 'general.shortUrls',
          title: 'Create short-urls',
        },
      ],
    },
    {
      feature: 'reporting',
      title: 'Reporting',
      features: [
        {
          feature: 'reporting.csv',
          title: 'Create CSV reports',
        },
        {
          feature: 'reporting.pdf',
          title: 'Create PDF reports',
        },
        {
          feature: 'reporting.png',
          title: 'Create PNG (image) reports',
        },
      ],
    },
    {
      feature: 'alerting',
      title: 'Alerting',
      features: [
        {
          feature: 'alerting.view',
          title: 'View alerts',
        },
        {
          feature: 'alerting.create',
          title: 'Create alerts',
        },
        {
          feature: 'alerting.ack',
          title: 'Mute/Acknowledge alerts',
        },
      ],
    },
  ],
  visualize: [
    {
      feature: 'general',
      title: 'General',
      features: [
        {
          feature: 'general.access',
          title: 'Access application',
          checked: true,
          disabled: true,
        },
        {
          feature: 'general.shortUrls',
          title: 'Create short-urls',
        },
      ],
    },
    {
      feature: 'visualize',
      title: 'Create visualizations',
      features: [
        {
          feature: 'visualize.traditional',
          title: 'Create traditional visualizations',
        },
        {
          feature: 'visualize.lens',
          title: 'Create Lens visualizations',
        },
        {
          feature: 'visualize.timelion',
          title: 'Create Timelion visualizations',
        },
        {
          feature: 'visualize.tsvb',
          title: 'Create TSVB visualizations',
        },
        {
          feature: 'visualize.map',
          title: 'Create Map visualizations',
        },
      ],
    },
    {
      feature: 'reporting',
      title: 'Reporting',
      features: [
        {
          feature: 'reporting.csv',
          title: 'Create CSV reports',
        },
        {
          feature: 'reporting.pdf',
          title: 'Create PDF reports',
        },
        {
          feature: 'reporting.png',
          title: 'Create PNG (image) reports',
        },
      ],
    },
    {
      feature: 'alerting',
      title: 'Alerting',
      features: [
        {
          feature: 'alerting.view',
          title: 'View alerts',
        },
        {
          feature: 'alerting.create',
          title: 'Create alerts',
        },
        {
          feature: 'alerting.ack',
          title: 'Mute/Acknowledge alerts',
        },
      ],
    },
  ],
  dashboard: [
    {
      feature: 'general',
      title: 'General',
      features: [
        {
          feature: 'general.access',
          title: 'Access application',
          checked: true,
          disabled: true,
        },
        {
          feature: 'general.saveSearch',
          title: 'Create dashboards',
        },
        {
          feature: 'general.shortUrls',
          title: 'Create short-urls',
        },
      ],
    },
    {
      feature: 'reporting',
      title: 'Reporting',
      features: [
        {
          feature: 'reporting.csv',
          title: 'Create CSV reports',
        },
        {
          feature: 'reporting.pdf',
          title: 'Create PDF reports',
        },
        {
          feature: 'reporting.png',
          title: 'Create PNG (image) reports',
        },
      ],
    },
    {
      feature: 'alerting',
      title: 'Alerting',
      features: [
        {
          feature: 'alerting.view',
          title: 'View alerts',
        },
        {
          feature: 'alerting.create',
          title: 'Create alerts',
        },
        {
          feature: 'alerting.ack',
          title: 'Mute/Acknowledge alerts',
        },
      ],
    },
  ],
  dev_tools: [
    {
      feature: 'general',
      title: 'General',
      features: [
        {
          feature: 'general.access',
          title: 'Access application',
          checked: true,
          disabled: true,
        },
        {
          feature: 'general.grokDebugger',
          title: 'Use grok debugger',
        },
        {
          feature: 'general.searchProfiler',
          title: 'Use search profiler',
        },
      ],
    },
  ],
  advancedSettings: [
    {
      feature: 'general',
      title: 'General',
      features: [
        {
          feature: 'general.access',
          title: 'Access application',
          checked: true,
          disabled: true,
        },
        {
          feature: 'general.changeSettings',
          title: 'Change settings',
        },
      ],
    },
  ],
  indexPatterns: [
    {
      feature: 'general',
      title: 'General',
      features: [
        {
          feature: 'general.access',
          title: 'Access application',
          checked: true,
          disabled: true,
        },
      ],
    },
    {
      feature: 'indexPatterns',
      title: 'Index Patterns',
      features: [
        {
          feature: 'ip.create',
          title: 'Create index patterns',
        },
        {
          feature: 'ip.create',
          title: 'Create scripted fields',
        },
      ],
    },
  ],
  savedObjectsManagement: [
    {
      feature: 'general',
      title: 'General',
      features: [
        {
          feature: 'general.access',
          title: 'Access application',
          checked: true,
          disabled: true,
        },
      ],
    },
    {
      feature: 'savedObjects',
      title: 'Saved Objects',
      features: [
        {
          feature: 'so.manage',
          title: 'Manage saved objects',
        },
        {
          feature: 'so.import',
          title: 'Import saved objects',
        },
        {
          feature: 'so.export',
          title: 'Export saved objects',
        },
        {
          feature: 'so.cts',
          title: 'Copy to space',
        },
      ],
    },
  ],
  graph: [
    {
      feature: 'general',
      title: 'General',
      features: [
        {
          feature: 'general.access',
          title: 'Access application',
          checked: true,
          disabled: true,
        },
        {
          feature: 'general.changeSettings',
          title: 'Save worksheets',
        },
      ],
    },
  ],
  apm: [
    {
      feature: 'general',
      title: 'General',
      features: [
        {
          feature: 'general.access',
          title: 'Access application',
          checked: true,
          disabled: true,
        },
      ],
    },
  ],
  code: [
    {
      feature: 'general',
      title: 'General',
      features: [
        {
          feature: 'general.access',
          title: 'Access application',
          checked: true,
          disabled: true,
        },
      ],
    },
    {
      feature: 'repo',
      title: 'Repositories',
      features: [
        {
          feature: 'repo.clone',
          title: 'Clone repository',
        },
        {
          feature: 'repo.clone',
          title: 'Refresh repository',
        },
        {
          feature: 'repo.clone',
          title: 'Delete repository',
        },
      ],
    },
  ],
  maps: [
    {
      feature: 'general',
      title: 'General',
      features: [
        {
          feature: 'general.access',
          title: 'Access application',
          checked: true,
          disabled: true,
        },
        {
          feature: 'maps.create',
          title: 'Create maps',
        },
      ],
    },
    {
      feature: 'maps.layers',
      title: 'Map layers',
      features: [
        {
          feature: 'maps.tms',
          title: 'Use custom Tile Map Service',
        },
        {
          feature: 'maps.wms',
          title: 'Use custom Web Map Service',
        },
      ],
    },
  ],
  canvas: [
    {
      feature: 'general',
      title: 'General',
      features: [
        {
          feature: 'general.access',
          title: 'Access application',
          checked: true,
          disabled: true,
        },
      ],
    },
    {
      feature: 'canvas',
      title: 'Workpad',
      features: [
        {
          feature: 'workpad.assets',
          title: 'Manage workpad assets',
        },
        {
          feature: 'workpad.expression',
          title: 'Enable expression editor',
        },
        {
          feature: 'workpad.elements',
          title: 'Create custom wordpad elements',
        },
      ],
    },
  ],
  infrastructure: [
    {
      feature: 'general',
      title: 'General',
      features: [
        {
          feature: 'general.access',
          title: 'Access application',
          checked: true,
          disabled: true,
        },
        {
          feature: 'general.settings',
          title: 'Configure settings',
        },
      ],
    },
  ],
  logs: [
    {
      feature: 'general',
      title: 'General',
      features: [
        {
          feature: 'general.access',
          title: 'Access application',
          checked: true,
          disabled: true,
        },
        {
          feature: 'general.settings',
          title: 'Configure settings',
        },
      ],
    },
  ],
  siem: [
    {
      feature: 'general',
      title: 'General',
      features: [
        {
          feature: 'general.access',
          title: 'Access application',
          checked: true,
          disabled: true,
        },
        {
          feature: 'general.settings',
          title: 'Create timelines',
        },
        {
          feature: 'general.comment',
          title: 'Comment on timelines',
        },
      ],
    },
  ],
  uptime: [
    {
      feature: 'general',
      title: 'General',
      features: [
        {
          feature: 'general.access',
          title: 'Access application',
          checked: true,
          disabled: true,
        },
        {
          feature: 'general.settings',
          title: 'Configure settings',
        },
      ],
    },
  ],
};

interface Props {
  feature: Feature;
  privilegeCalculator: POCPrivilegeCalculator;
  role: Role;
  spacesIndex: number;
  onChange: (featureId: string, featurePrivileges: string[]) => void;
}
export const SubFeatureForm = ({
  feature,
  role,
  spacesIndex,
  privilegeCalculator,
  onChange,
}: Props) => {
  const columns = [
    {
      field: 'feature',
      name: 'Sub Feature',
    },
    {
      field: 'privilege',
      name: 'grants',
    },
  ];

  const inheritedPrivileges = privilegeCalculator.getInheritedSpaceFeaturePrivileges(
    role.kibana,
    '*',
    feature.id
  );
  const effectivePrivileges = privilegeCalculator.getEffectiveGlobalFeaturePrivileges(
    role.kibana,
    feature.id
  );

  const onPrivilegeChange = (privilegeId: string, e: ChangeEvent<HTMLInputElement>) => {
    let assignedPrivileges = [...(role.kibana[spacesIndex].feature[feature.id] || [])];
    if (e.target.checked) {
      assignedPrivileges.push(privilegeId);
    } else {
      assignedPrivileges = assignedPrivileges.filter(ap => ap !== privilegeId);
    }

    console.log({
      featureId: feature.id,
      assignedPrivileges,
      privilegeId,
      checked: e.target.checked,
    });

    onChange(feature.id, assignedPrivileges);
  };

  const items = feature.privileges.custom
    ? feature.privileges.custom.map(category => {
        return {
          title: category.categoryName,
          features: category.privileges.map(categoryPrivilege => {
            const disabled = !privilegeCalculator.canToggleFeaturePrivilege(
              role.kibana,
              '*',
              feature.id,
              categoryPrivilege.id
            );

            if (disabled) {
              const resp = privilegeCalculator.getPrivilegesResponsibleForFeaturePrivilegeGrant(
                role.kibana,
                '*',
                feature.id,
                categoryPrivilege.id
              );
              console.log('responsible privileges', { feature: categoryPrivilege.id, resp });
            }

            return {
              feature: categoryPrivilege.id,
              title: categoryPrivilege.name,
              checked: effectivePrivileges.includes(categoryPrivilege.id),
              disabled,
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
