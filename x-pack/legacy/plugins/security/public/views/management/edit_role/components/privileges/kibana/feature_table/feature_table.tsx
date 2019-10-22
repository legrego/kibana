/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  // @ts-ignore
  EuiButtonGroup,
  EuiIcon,
  EuiIconTip,
  EuiInMemoryTable,
  EuiText,
  IconType,
} from '@elastic/eui';
import { FormattedMessage, InjectedIntl } from '@kbn/i18n/react';
import _ from 'lodash';
import React, { Component } from 'react';
import { POCPrivilegeCalculator } from 'plugins/security/lib/poc_privilege_calculator/poc_privilege_calculator';
import { KibanaPrivileges } from '../../../../../../../../common/model/poc_kibana_privileges';
import { FeatureViewModel } from '../../../../../../../../../../../plugins/features/public/types';
import { FeaturesPrivileges, Role } from '../../../../../../../../common/model';
import { Privilege } from '../../../../../../../../common/model/poc_kibana_privileges/privilege_instance';
import {
  AllowedPrivilege,
  CalculatedPrivilege,
  PrivilegeExplanation,
} from '../../../../../../../lib/kibana_privilege_calculator';
import { isGlobalPrivilegeDefinition } from '../../../../../../../lib/privilege_utils';
import { NO_PRIVILEGE_VALUE } from '../../../../lib/constants';
import { PrivilegeDisplay } from '../space_aware_privilege_section/privilege_display';
import { ChangeAllPrivilegesControl } from './change_all_privileges';
import { PrivilegeCombobox } from './privilege_combobox';

interface Props {
  role: Role;
  features: FeatureViewModel[];
  privilegeCalculator: POCPrivilegeCalculator;
  kibanaPrivileges: KibanaPrivileges;
  intl: InjectedIntl;
  spacesIndex: number;
  onChange: (featureId: string, privileges: string[]) => void;
  onChangeAll: (privileges: string[]) => void;
  disabled?: boolean;
}

interface State {
  expandedFeatures: string[];
}

interface TableRow {
  featureId: string;
  feature: FeatureViewModel;
  inherited: Privilege[];
  effective: Privilege[];
  role: Role;
}

export class FeatureTable extends Component<Props, State> {
  public static defaultProps = {
    spacesIndex: -1,
    showLocks: true,
  };

  constructor(props: Props) {
    super(props);
    this.state = {
      expandedFeatures: ['discover'],
    };
  }

  public render() {
    const { role, features, privilegeCalculator, spacesIndex } = this.props;

    const items: TableRow[] = features
      .sort((feature1, feature2) => {
        if (
          Object.keys(feature1.privileges).length === 0 &&
          Object.keys(feature2.privileges).length > 0
        ) {
          return 1;
        }

        if (
          Object.keys(feature2.privileges).length === 0 &&
          Object.keys(feature1.privileges).length > 0
        ) {
          return -1;
        }

        return 0;
      })
      .map(feature => {
        const inherited = privilegeCalculator.getInheritedFeaturePrivileges(
          role,
          spacesIndex,
          feature.id
        );

        const effective = privilegeCalculator.getEffectiveFeaturePrivileges(
          role,
          spacesIndex,
          feature.id
        );

        return {
          featureId: feature.id,
          feature,
          inherited,
          effective,
          role,
        };
      });

    // TODO: This simply grabs the available privileges from the first feature we encounter.
    // As of now, features can have 'all' and 'read' as available privileges. Once that assumption breaks,
    // this will need updating. This is a simplifying measure to enable the new UI.
    const availablePrivileges = _.uniq(
      features.map(feature => feature.privileges.required).flat()
    ).map(rp => rp.name);

    return (
      // @ts-ignore missing responsive from typedef
      <EuiInMemoryTable
        // @ts-ignore missing rowProps from typedef
        responsive={false}
        columns={this.getColumns(availablePrivileges)}
        itemId={'featureId'}
        // itemIdToExpandedRowMap={this.state.expandedFeatures.reduce((acc, fid) => {
        //   return {
        //     ...acc,
        //     [fid]: (
        //       <SubFeatureForm
        //         spacesIndex={this.props.spacesIndex}
        //         feature={this.props.features.find(f => f.id === fid)!}
        //         onChange={() => null}
        //         role={this.props.role}
        //       />
        //     ),
        //   };
        // }, {})}
        items={items}
      />
    );
  }

  public onChange = (featureId: string) => (featurePrivilegeId: string) => {
    const privilege = featurePrivilegeId.substr(`${featureId}_`.length);
    if (privilege === NO_PRIVILEGE_VALUE) {
      this.props.onChange(featureId, []);
    } else {
      this.props.onChange(featureId, [privilege]);
    }
  };

  private getColumns = (availablePrivileges: string[]) => {
    const inheritedColumn = this.isConfiguringGlobalPrivileges()
      ? []
      : [
          {
            field: 'inherited',
            name: this.props.intl.formatMessage({
              id:
                'xpack.security.management.editRole.featureTable.enabledRoleFeaturesInheritedColumnTitle',
              defaultMessage: 'Inherited',
            }),
            render: (inherited: Privilege[]) => {
              return inherited.map(i => i.id).join(', ');
            },
          },
        ];

    const columns = [
      {
        field: 'feature',
        name: this.props.intl.formatMessage({
          id:
            'xpack.security.management.editRole.featureTable.enabledRoleFeaturesFeatureColumnTitle',
          defaultMessage: 'Feature',
        }),
        render: (feature: FeatureViewModel) => {
          let tooltipElement = null;
          if (feature.privilegesTooltip) {
            const tooltipContent = (
              <EuiText>
                <p>{feature.privilegesTooltip}</p>
              </EuiText>
            );
            tooltipElement = (
              <EuiIconTip
                iconProps={{
                  className: 'eui-alignTop',
                }}
                type={'iInCircle'}
                color={'subdued'}
                content={tooltipContent}
              />
            );
          }

          return (
            <span>
              <EuiIcon
                size="m"
                type={feature.icon as IconType}
                className="secPrivilegeFeatureIcon"
              />
              {feature.name} {tooltipElement}
            </span>
          );
        },
      },
      ...inheritedColumn,
      {
        field: 'privilege',
        name: (
          <span>
            <FormattedMessage
              id="xpack.security.management.editRole.featureTable.enabledRoleFeaturesEnabledColumnTitle"
              defaultMessage="Privilege"
            />
            {!this.props.disabled && (
              <ChangeAllPrivilegesControl
                privileges={[...availablePrivileges, NO_PRIVILEGE_VALUE]}
                onChange={this.onChangeAllFeaturePrivileges}
              />
            )}
          </span>
        ),
        render: (roleEntry: Role, record: TableRow) => {
          const { id: featureId, name: featureName, reserved, privileges } = record.feature;

          if (reserved && Object.keys(privileges).length === 0) {
            return <EuiText size={'s'}>{reserved.description}</EuiText>;
          }

          const featurePrivileges = this.props.kibanaPrivileges.getFeaturePrivileges(featureId);

          if (featurePrivileges.length === 0) {
            return null;
          }

          const enabledFeaturePrivileges = this.getEnabledFeaturePrivileges(
            featurePrivileges,
            featureId
          );

          const allowsNone = this.allowsNoneForPrivilegeAssignment(featureId);

          const actualPrivilegeValue = this.props.privilegeCalculator.getAssignedFeaturePrivileges(
            this.props.role,
            this.props.spacesIndex,
            featureId
          );

          const canChangePrivilege =
            !this.props.disabled && (allowsNone || enabledFeaturePrivileges.length > 1);

          if (!canChangePrivilege) {
            const assignedBasePrivilege =
              this.props.role.kibana[this.props.spacesIndex].base.length > 0;

            const excludedFromBasePrivilegsTooltip = (
              <FormattedMessage
                id="xpack.security.management.editRole.featureTable.excludedFromBasePrivilegsTooltip"
                defaultMessage='Use "Custom" privileges to grant access. {featureName} isn&apos;t part of the base privileges.'
                values={{ featureName }}
              />
            );

            return (
              <PrivilegeDisplay
                privilege={actualPrivilegeValue.map(v => v.id)}
                tooltipContent={
                  assignedBasePrivilege && actualPrivilegeValue.length === 0
                    ? excludedFromBasePrivilegsTooltip
                    : undefined
                }
              />
            );
          }

          const form = this.props.role.kibana[this.props.spacesIndex];
          const selected = form && form.feature && form.feature[record.feature.id];

          return (
            <PrivilegeCombobox
              feature={record.feature as any}
              selectedPrivileges={selected || []}
              inheritedPrivileges={record.inherited.map(i => i.id)}
              effectivePrivileges={record.effective.map(i => i.id)}
              onChange={newPrivileges => this.props.onChange(record.feature.id, newPrivileges)}
            />
          );

          const options = availablePrivileges.map(priv => {
            return {
              id: `${featureId}_${priv}`,
              label: _.capitalize(priv),
              isDisabled: !enabledFeaturePrivileges.includes(priv),
            };
          });

          options.push({
            id: `${featureId}_${NO_PRIVILEGE_VALUE}`,
            label: 'None',
            isDisabled: !allowsNone,
          });

          return (
            // @ts-ignore missing name from typedef
            <EuiButtonGroup
              // @ts-ignore missing rowProps from typedef
              name={`featurePrivilege_${featureId}`}
              options={options}
              idSelected={`${featureId}_${actualPrivilegeValue || NO_PRIVILEGE_VALUE}`}
              onChange={this.onChange(featureId)}
            />
          );
        },
      },
    ];
    return columns;
  };

  private getEnabledFeaturePrivileges = (featurePrivileges: Privilege[], featureId: string) => {
    return featurePrivileges;

    const { allowedPrivileges } = this.props;

    if (this.isConfiguringGlobalPrivileges()) {
      // Global feature privileges are not limited by effective privileges.
      return featurePrivileges;
    }

    const allowedFeaturePrivileges = allowedPrivileges.feature[featureId];
    if (allowedFeaturePrivileges == null) {
      throw new Error('Unable to get enabled feature privileges for a feature without privileges');
    }

    return allowedFeaturePrivileges.privileges;
  };

  private getPrivilegeExplanation = (featureId: string): PrivilegeExplanation => {
    return {
      actualPrivilege: '????',
    };
    const { calculatedPrivileges } = this.props;
    const calculatedFeaturePrivileges = calculatedPrivileges.feature[featureId];
    if (calculatedFeaturePrivileges == null) {
      throw new Error('Unable to get privilege explanation for a feature without privileges');
    }

    return calculatedFeaturePrivileges;
  };

  private allowsNoneForPrivilegeAssignment = (featureId: string): boolean => {
    // TODO: calculating too much here
    const exp = this.props.privilegeCalculator.explainAllEffectiveFeaturePrivileges(
      this.props.role,
      this.props.spacesIndex
    );

    return true;
  };

  private onChangeAllFeaturePrivileges = (privilege: string) => {
    if (privilege === NO_PRIVILEGE_VALUE) {
      this.props.onChangeAll([]);
    } else {
      this.props.onChangeAll([privilege]);
    }
  };

  private isConfiguringGlobalPrivileges = () =>
    isGlobalPrivilegeDefinition(this.props.role.kibana[this.props.spacesIndex]);
}
