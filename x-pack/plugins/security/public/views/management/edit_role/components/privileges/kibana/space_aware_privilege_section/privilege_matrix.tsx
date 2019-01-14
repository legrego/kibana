/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  EuiButton,
  EuiButtonEmpty,
  EuiIcon,
  EuiIconTip,
  // @ts-ignore
  EuiInMemoryTable,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
  // @ts-ignore
  EuiSuperSelect,
  // @ts-ignore
  EuiToolTip,
} from '@elastic/eui';
import { FormattedMessage, InjectedIntl } from '@kbn/i18n/react';
import React, { Component, Fragment } from 'react';
import { Feature } from 'x-pack/plugins/xpack_main/types';
import { Space } from '../../../../../../../../../spaces/common/model/space';
import { SpaceAvatar } from '../../../../../../../../../spaces/public/components';
import { FeaturePrivilegeSet, Role } from '../../../../../../../../common/model';
import { EffectivePrivileges } from '../../../../../../../lib/effective_privileges';
import { isGlobalPrivilegeDefinition } from '../../../../../../../lib/privilege_utils';
import { SpacesPopoverList } from '../../../spaces_popover_list';
import { PrivilegeDisplay } from './privilege_display';

const SPACES_DISPLAY_COUNT = 4;

interface Props {
  role: Role;
  spaces: Space[];
  features: Feature[];
  effectivePrivileges: EffectivePrivileges;
  intl: InjectedIntl;
}

interface State {
  showModal: boolean;
}

interface TableRow {
  feature: Feature & { isBase: boolean };
  tooltip?: string;
  role: Role;
}

interface SpacesColumn {
  isGlobal: boolean;
  spacesIndex: number;
  spaces: Space[];
  privileges: {
    base: string[];
    feature: FeaturePrivilegeSet;
  };
}

export class PrivilegeMatrix extends Component<Props, State> {
  public state = {
    showModal: false,
  };
  public render() {
    let modal = null;
    if (this.state.showModal) {
      modal = (
        <EuiOverlayMask>
          <EuiModal onClose={this.hideModal}>
            <EuiModalHeader>
              <EuiModalHeaderTitle>
                <FormattedMessage
                  id="xpack.security.management.editRole.spacePrivilegeMatrix.modalTitle"
                  defaultMessage="Privilege summary matrix"
                />
              </EuiModalHeaderTitle>
            </EuiModalHeader>
            <EuiModalBody>{this.renderTable()}</EuiModalBody>
            <EuiModalFooter>
              <EuiButton onClick={this.hideModal} fill>
                <FormattedMessage
                  id="xpack.security.management.editRole.spacePrivilegeMatrix.closeButton"
                  defaultMessage="Close"
                />
              </EuiButton>
            </EuiModalFooter>
          </EuiModal>
        </EuiOverlayMask>
      );
    }

    return (
      <Fragment>
        <EuiButtonEmpty onClick={this.showModal}>
          <FormattedMessage
            id="xpack.security.management.editRole.spacePrivilegeMatrix.showSummaryText"
            defaultMessage="Show privilege summary"
          />
        </EuiButtonEmpty>
        {modal}
      </Fragment>
    );
  }

  private renderTable = () => {
    const { role, features, intl } = this.props;

    const spacePrivileges = role.kibana;

    const globalPrivilege = this.locateGlobalPrivilege();

    const spacesColumns: SpacesColumn[] = [];

    spacePrivileges.forEach((spacePrivs, spacesIndex) => {
      spacesColumns.push({
        isGlobal: isGlobalPrivilegeDefinition(spacePrivs),
        spacesIndex,
        spaces: spacePrivs.spaces
          .map(spaceId => this.props.spaces.find(space => space.id === spaceId))
          .filter(Boolean) as Space[],
        privileges: {
          base: spacePrivs.base,
          feature: spacePrivs.feature,
        },
      });
    });

    const rows: TableRow[] = [
      {
        feature: {
          id: '*base*',
          isBase: true,
          name: intl.formatMessage({
            id: 'xpack.security.management.editRole.spacePrivilegeMatrix.basePrivilegeText',
            defaultMessage: 'Base privilege',
          }),
          privileges: {},
        },
        role,
      },
      ...features.map(feature => ({
        feature: {
          ...feature,
          isBase: false,
        },
        role,
      })),
    ];

    const columns = [
      {
        field: 'feature',
        name: intl.formatMessage({
          id: 'xpack.security.management.editRole.spacePrivilegeMatrix.featureColumnTitle',
          defaultMessage: 'Feature',
        }),
        render: (feature: Feature & { isBase: boolean }) => {
          return feature.isBase ? (
            <Fragment>
              <strong>{feature.name}</strong>
              <EuiIconTip
                // TODO: Waiting on update from EUI
                // iconProps={{
                //   className: 'eui-alignTop',
                // }}
                type="questionInCircle"
                content={intl.formatMessage({
                  id:
                    'xpack.security.management.editRole.spacePrivilegeMatrix.basePrivilegeTooltip',
                  defaultMessage: 'Lowest privilege level allowed',
                })}
                color="subdued"
              />
            </Fragment>
          ) : (
            <Fragment>
              {feature.icon && (
                <EuiIcon className="secPrivilegeFeatureIcon" size="m" type={feature.icon} />
              )}
              {feature.name}
            </Fragment>
          );
        },
      },
      ...spacesColumns.map(item => {
        return {
          field: 'feature',
          name: (
            <Fragment>
              {item.spaces.slice(0, SPACES_DISPLAY_COUNT).map((space: Space) => (
                <span key={space.id}>
                  <SpaceAvatar size="s" space={space} />{' '}
                  {item.isGlobal && (
                    <span>
                      Global <br />
                      (all spaces)
                    </span>
                  )}
                </span>
              ))}
              {item.spaces.length > SPACES_DISPLAY_COUNT && (
                <SpacesPopoverList
                  spaces={item.spaces}
                  intl={this.props.intl}
                  buttonText={this.props.intl.formatMessage(
                    {
                      id:
                        'xpack.security.management.editRole.spacePrivilegeMatrix.showNMoreSpacesLink',
                      defaultMessage: '+{count} more',
                    },
                    { count: item.spaces.length - SPACES_DISPLAY_COUNT }
                  )}
                />
              )}
            </Fragment>
          ),
          render: (feature: Feature & { isBase: boolean }, record: TableRow) => {
            return this.renderPrivilegeDisplay(item, record, globalPrivilege.base);
          },
        };
      }),
    ];

    return (
      <EuiInMemoryTable
        columns={columns}
        items={rows}
        rowProps={(item: TableRow) => {
          return {
            className: item.feature.isBase ? 'secPrivilegeMatrix__row--isBasePrivilege' : '',
          };
        }}
        cellProps={(item: any) => {
          // TODO: FIX THIS TO ACTUALLY WORK
          return {
            className: item.isGlobal ? 'secPrivilegeMatrix__cell--isGlobalPrivilege' : '',
          };
        }}
      />
    );
  };

  private renderPrivilegeDisplay = (
    column: SpacesColumn,
    { feature }: TableRow,
    globalBasePrivilege: string[]
  ) => {
    if (column.isGlobal) {
      if (feature.isBase) {
        return <PrivilegeDisplay scope={'global'} privilege={globalBasePrivilege} />;
      }

      const actualPrivileges = this.props.effectivePrivileges.getActualGlobalFeaturePrivilege(
        feature.id
      );

      return <PrivilegeDisplay scope={'global'} privilege={actualPrivileges} />;
    } else {
      // not global

      if (feature.isBase) {
        // Space base privilege
        const actualBasePrivileges = this.props.effectivePrivileges.explainActualSpaceBasePrivilege(
          column.spacesIndex
        );

        return (
          <PrivilegeDisplay
            scope={'space'}
            explanation={actualBasePrivileges}
            privilege={actualBasePrivileges.privilege}
          />
        );
      }

      // Space feature privilege
      const actualPrivileges = this.props.effectivePrivileges.explainActualSpaceFeaturePrivilege(
        feature.id,
        column.spacesIndex
      );

      return (
        <PrivilegeDisplay
          scope={'space'}
          explanation={actualPrivileges}
          privilege={actualPrivileges.privilege}
        />
      );
    }
  };

  private locateGlobalPrivilege = () => {
    return (
      this.props.role.kibana.find(spacePriv => isGlobalPrivilegeDefinition(spacePriv)) || {
        spaces: ['*'],
        base: [],
        feature: [],
      }
    );
  };

  private hideModal = () => {
    this.setState({
      showModal: false,
    });
  };

  private showModal = () => {
    this.setState({
      showModal: true,
    });
  };
}
