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
  EuiButtonIcon,
  EuiComboBox,
} from '@elastic/eui';
import { FormattedMessage, InjectedIntl } from '@kbn/i18n/react';
import _ from 'lodash';
import React, { Component } from 'react';
import { POCPrivilegeCalculator } from 'plugins/security/lib/poc_privilege_calculator/poc_privilege_calculator';
import { Feature } from '../../../../../../../../../../../plugins/features/server';
import { FeaturesPrivileges, KibanaPrivileges, Role } from '../../../../../../../../common/model';
import {
  AllowedPrivilege,
  CalculatedPrivilege,
  PrivilegeExplanation,
} from '../../../../../../../lib/kibana_privilege_calculator';
import { isGlobalPrivilegeDefinition } from '../../../../../../../lib/privilege_utils';
import { NO_PRIVILEGE_VALUE } from '../../../../lib/constants';
import { PrivilegeDisplay } from '../space_aware_privilege_section/privilege_display';
import { ChangeAllPrivilegesControl } from './change_all_privileges';
import { SubFeatureForm } from './sub_feature_form';

interface Props {
  role: Role;
  features: Feature[];
  calculatedPrivileges: CalculatedPrivilege;
  allowedPrivileges: AllowedPrivilege;
  rankedFeaturePrivileges: FeaturesPrivileges;
  kibanaPrivileges: KibanaPrivileges;
  intl: InjectedIntl;
  spacesIndex: number;
  onChange: (featureId: string, privileges: string[]) => void;
  onChangeAll: (privileges: string[]) => void;
  disabled?: boolean;
}

interface TableFeature extends Feature {
  hasAnyPrivilegeAssigned: boolean;
}

interface TableRow {
  id: string;
  feature: TableFeature;
  role: Role;
}

interface State {
  expandedItemIds: string[];
}

export class FeatureTable extends Component<Props, State> {
  public static defaultProps = {
    spacesIndex: -1,
    showLocks: true,
  };

  constructor(props: Props) {
    super(props);
    this.state = {
      expandedItemIds: [],
    };
  }

  public render() {
    const { role, features } = this.props;

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
        // const calculatedFeaturePrivileges = calculatedPrivileges.feature[feature.id];
        const hasAnyPrivilegeAssigned = true;
        // Boolean(
        //   calculatedFeaturePrivileges &&
        //     calculatedFeaturePrivileges.actualPrivilege !== NO_PRIVILEGE_VALUE
        // );
        return {
          id: feature.id,
          feature: {
            ...feature,
            hasAnyPrivilegeAssigned,
          },
          role,
        };
      });

    // TODO: This simply grabs the available privileges from the first feature we encounter.
    // As of now, features can have 'all' and 'read' as available privileges. Once that assumption breaks,
    // this will need updating. This is a simplifying measure to enable the new UI.
    // const availablePrivileges = Object.values(rankedFeaturePrivileges)[0];

    const itemIdToExpandedRowMap = this.state.expandedItemIds.reduce((acc, featureId) => {
      return {
        ...acc,
        [featureId]: this.getSubFeatureForm(featureId),
      };
    }, {});

    return (
      // @ts-ignore missing responsive from typedef
      <EuiInMemoryTable
        // @ts-ignore missing rowProps from typedef
        responsive={false}
        columns={this.getColumns()}
        itemId={'id'}
        className="subFeaturesPrototype"
        itemIdToExpandedRowMap={itemIdToExpandedRowMap}
        items={items}
      />
    );
  }

  public onChange = (featureId: string) => (selectedOption: any) => {
    const privilege = selectedOption[0].id.substr(`${featureId}_`.length);
    if (privilege === NO_PRIVILEGE_VALUE) {
      if (this.state.expandedItemIds.includes(featureId)) {
        this.toggleExpandFeature(featureId);
      }
      this.props.onChange(featureId, []);
    } else if (privilege === 'CUSTOM') {
      if (!this.state.expandedItemIds.includes(featureId)) {
        this.toggleExpandFeature(featureId);
      }
      this.props.onChange(featureId, []);
    } else {
      if (this.state.expandedItemIds.includes(featureId)) {
        this.toggleExpandFeature(featureId);
      }
      this.props.onChange(featureId, [privilege]);
    }
  };

  // TODO: hack
  private getColumns = (availablePrivileges: string[] = ['all', 'read']) => [
    {
      field: 'feature',
      name: this.props.intl.formatMessage({
        id: 'xpack.security.management.editRole.featureTable.enabledRoleFeaturesFeatureColumnTitle',
        defaultMessage: 'Feature',
      }),
      render: (feature: TableFeature) => {
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
            <EuiIcon size="m" type={feature.icon as IconType} className="secPrivilegeFeatureIcon" />
            {feature.name} {tooltipElement}
          </span>
        );
      },
    },
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

        const featurePrivileges = this.props.kibanaPrivileges
          .getFeaturePrivileges()
          .getPrivileges(featureId);

        if (featurePrivileges.length === 0) {
          return null;
        }

        const enabledFeaturePrivileges = this.getEnabledFeaturePrivileges(
          featurePrivileges,
          featureId
        );

        const privilegeExplanation = this.getPrivilegeExplanation(featureId);

        const allowsNone = this.allowsNoneForPrivilegeAssignment(featureId);

        const actualPrivilegeValue = privilegeExplanation.actualPrivilege;

        const canChangePrivilege =
          !this.props.disabled && (allowsNone || enabledFeaturePrivileges.length > 0);

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
              privilege={actualPrivilegeValue}
              explanation={privilegeExplanation}
              tooltipContent={
                assignedBasePrivilege && actualPrivilegeValue === NO_PRIVILEGE_VALUE
                  ? excludedFromBasePrivilegsTooltip
                  : undefined
              }
            />
          );
        }

        const options = availablePrivileges.map(priv => {
          return {
            id: `${featureId}_${priv}`,
            label: _.capitalize(priv),
            isDisabled: !enabledFeaturePrivileges.includes(priv),
          };
        });

        options.push({
          id: `${featureId}_CUSTOM`,
          label: 'Custom',
          isDisabled: !allowsNone,
        });

        options.push({
          id: `${featureId}_${NO_PRIVILEGE_VALUE}`,
          label: 'None',
          isDisabled: !allowsNone,
        });

        const effectiveFeaturePrivs = new POCPrivilegeCalculator(this.props.kibanaPrivileges)
          .getEffectiveFeaturePrivileges(
            this.props.role.kibana,
            this.props.role.kibana[this.props.spacesIndex].spaces,
            featureId
          )
          .sort();

        const assignedFeaturePrivs = new POCPrivilegeCalculator(
          this.props.kibanaPrivileges
        ).getAssignedFeaturePrivileges(
          this.props.role.kibana,
          this.props.role.kibana[this.props.spacesIndex].spaces,
          featureId
        );

        const effectivePrivilege =
          ['all', 'read'].find(p => effectiveFeaturePrivs.includes(p)) || NO_PRIVILEGE_VALUE;
        const hasCustomizations = assignedFeaturePrivs.some(p => !['all', 'read'].includes(p));

        const selectedOption = hasCustomizations ? 'CUSTOM' : effectivePrivilege;

        return (
          <EuiComboBox
            compressed
            options={options}
            selectedOptions={options.filter(o => o.id === `${featureId}_${selectedOption}`)}
            singleSelection={{ asPlainText: true }}
            onChange={this.onChange(featureId)}
            isClearable={false}
          />
        );
      },
    },
    {
      field: 'feature',
      name: 'Advanced',
      align: 'right',
      width: '100px',
      render: (feature: TableFeature) => {
        if (this.state.expandedItemIds.includes(feature.id)) {
          return (
            <EuiButtonIcon
              aria-label="asdf"
              iconType="arrowUp"
              onClick={() => this.toggleExpandFeature(feature.id)}
            />
          );
        }
        return (
          <EuiButtonIcon
            aria-label="asdf"
            iconType="arrowDown"
            onClick={() => this.toggleExpandFeature(feature.id)}
          />
        );
      },
    },
  ];

  private toggleExpandFeature = (featureId: string) => {
    const toggleOn = !this.state.expandedItemIds.includes(featureId);

    const expandedFeatures: string[] = [];
    if (toggleOn) {
      expandedFeatures.push(...this.state.expandedItemIds, featureId);
    } else {
      expandedFeatures.push(...this.state.expandedItemIds.filter(id => id !== featureId));
    }

    this.setState({
      expandedItemIds: expandedFeatures,
    });
  };

  private getSubFeatureForm = (featureId: string) => {
    const feature = this.props.features.find(f => f.id === featureId)!;
    if (feature.privileges.custom && feature.privileges.custom.length > 0) {
      return (
        <SubFeatureForm
          feature={this.props.features.find(f => f.id === featureId)!}
          role={this.props.role}
          spacesIndex={this.props.spacesIndex}
          onChange={this.props.onChange}
          privilegeCalculator={new POCPrivilegeCalculator(this.props.kibanaPrivileges)}
          disabled={this.props.disabled}
        />
      );
    }

    return (
      <EuiText size="s">
        <p>This feature does not support privilege customizations</p>
      </EuiText>
    );
  };

  private getEnabledFeaturePrivileges = (featurePrivileges: string[], featureId: string) => {
    const calc = new POCPrivilegeCalculator(this.props.kibanaPrivileges);
    const inherited = calc.getInheritedFeaturePrivileges(
      this.props.role.kibana,
      this.props.role.kibana[this.props.spacesIndex].spaces,
      featureId
    );
    return this.props.kibanaPrivileges
      .getFeaturePrivileges()
      .getPrivileges(featureId)
      .filter(privilege => !inherited.includes(privilege));

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
    const calc = new POCPrivilegeCalculator(this.props.kibanaPrivileges);
    const effective = calc.getEffectiveFeaturePrivileges(
      this.props.role.kibana,
      this.props.role.kibana[this.props.spacesIndex].spaces,
      featureId
    );
    return {
      actualPrivilege: effective.includes('all')
        ? 'all'
        : effective.includes('read')
        ? 'read'
        : NO_PRIVILEGE_VALUE,
    };
    const { calculatedPrivileges } = this.props;
    const calculatedFeaturePrivileges = calculatedPrivileges.feature[featureId];
    if (calculatedFeaturePrivileges == null) {
      throw new Error('Unable to get privilege explanation for a feature without privileges');
    }

    return calculatedFeaturePrivileges;
  };

  private allowsNoneForPrivilegeAssignment = (featureId: string): boolean => {
    const calc = new POCPrivilegeCalculator(this.props.kibanaPrivileges);
    const inherited = calc.getInheritedFeaturePrivileges(
      this.props.role.kibana,
      this.props.role.kibana[this.props.spacesIndex].spaces,
      featureId
    );

    return inherited.length === 0;
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
