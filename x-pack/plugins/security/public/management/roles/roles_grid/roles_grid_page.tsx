/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { Component } from 'react';
import {
  EuiButton,
  EuiIcon,
  EuiInMemoryTable,
  EuiLink,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiText,
  EuiTitle,
  EuiButtonIcon,
  EuiBasicTableColumn,
  EuiSwitchEvent,
  EuiSwitch,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { NotificationsStart } from 'src/core/public';
import {
  Role,
  isRoleEnabled,
  isReadOnlyRole,
  isReservedRole,
  isDeprecatedRole,
} from '../../../../common/model';
import { RolesAPIClient } from '../roles_api_client';
import { ConfirmDelete } from './confirm_delete';
import { PermissionDenied } from './permission_denied';

interface Props {
  notifications: NotificationsStart;
  rolesAPIClient: PublicMethodsOf<RolesAPIClient>;
}

interface State {
  roles: Role[];
  selection: Role[];
  filter: string;
  showDeleteConfirmation: boolean;
  permissionDenied: boolean;
  includeReservedRoles: boolean;
}

const getRoleManagementHref = (action: 'edit' | 'clone', roleName?: string) => {
  return `#/management/security/roles/${action}${roleName ? `/${roleName}` : ''}`;
};

export class RolesGridPage extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      roles: [],
      selection: [],
      filter: '',
      showDeleteConfirmation: false,
      permissionDenied: false,
      includeReservedRoles: true,
    };
  }

  public componentDidMount() {
    this.loadRoles();
  }

  public render() {
    const { permissionDenied } = this.state;

    return permissionDenied ? <PermissionDenied /> : this.getPageContent();
  }

  private getPageContent = () => {
    const { roles } = this.state;
    return (
      <EuiPageContent>
        <EuiPageContentHeader>
          <EuiPageContentHeaderSection>
            <EuiTitle>
              <h1>
                <FormattedMessage
                  id="xpack.security.management.roles.roleTitle"
                  defaultMessage="Roles"
                />
              </h1>
            </EuiTitle>
            <EuiText color="subdued" size="s">
              <p>
                <FormattedMessage
                  id="xpack.security.management.roles.subtitle"
                  defaultMessage="Apply roles to groups of users and manage permissions across the stack."
                />
              </p>
            </EuiText>
          </EuiPageContentHeaderSection>
          <EuiPageContentHeaderSection>
            <EuiButton data-test-subj="createRoleButton" href={getRoleManagementHref('edit')}>
              <FormattedMessage
                id="xpack.security.management.roles.createRoleButtonLabel"
                defaultMessage="Create role"
              />
            </EuiButton>
          </EuiPageContentHeaderSection>
        </EuiPageContentHeader>
        <EuiPageContentBody>
          {this.state.showDeleteConfirmation ? (
            <ConfirmDelete
              onCancel={this.onCancelDelete}
              rolesToDelete={this.state.selection.map(role => role.name)}
              callback={this.handleDelete}
              notifications={this.props.notifications}
              rolesAPIClient={this.props.rolesAPIClient}
            />
          ) : null}

          {
            <EuiInMemoryTable
              itemId="name"
              responsive={false}
              columns={this.getColumnConfig()}
              hasActions={true}
              selection={{
                selectable: (role: Role) => !role.metadata || !role.metadata._reserved,
                selectableMessage: (selectable: boolean) => (!selectable ? 'Role is reserved' : ''),
                onSelectionChange: (selection: Role[]) => this.setState({ selection }),
              }}
              pagination={{
                initialPageSize: 20,
                pageSizeOptions: [10, 20, 30, 50, 100],
              }}
              items={this.getVisibleRoles()}
              loading={roles.length === 0}
              search={{
                toolsLeft: this.renderToolsLeft(),
                toolsRight: this.renderToolsRight(),
                box: {
                  incremental: true,
                },
                onChange: (query: Record<string, any>) => {
                  this.setState({
                    filter: query.queryText,
                  });
                },
              }}
              sorting={{
                sort: {
                  field: 'name',
                  direction: 'asc',
                },
              }}
              rowProps={() => {
                return {
                  'data-test-subj': 'roleRow',
                };
              }}
              isSelectable
            />
          }
        </EuiPageContentBody>
      </EuiPageContent>
    );
  };

  private getColumnConfig = () => {
    const reservedRoleDesc = i18n.translate(
      'xpack.security.management.roles.reservedColumnDescription',
      { defaultMessage: 'Reserved roles are built-in and cannot be edited or removed.' }
    );

    return [
      {
        field: 'name',
        name: i18n.translate('xpack.security.management.roles.nameColumnName', {
          defaultMessage: 'Role',
        }),
        sortable: true,
        truncateText: true,
        render: (name: string, record: Role) => {
          return (
            <EuiText color="subdued" size="s">
              <EuiLink data-test-subj="roleRowName" href={getRoleManagementHref('edit', name)}>
                {name}
              </EuiLink>
              {!isRoleEnabled(record) && (
                <FormattedMessage
                  id="xpack.security.management.roles.disabledTooltip"
                  defaultMessage=" (disabled)"
                />
              )}
            </EuiText>
          );
        },
      },
      {
        field: 'metadata',
        name: i18n.translate('xpack.security.management.roles.reservedColumnName', {
          defaultMessage: 'Reserved',
        }),
        sortable: (role: Role) => isReservedRole(role),
        dataType: 'boolean',
        align: 'right',
        description: reservedRoleDesc,
        render: (metadata: Role['metadata'], record: Role) => {
          const isDeprecated = isDeprecatedRole(record);

          const label = isDeprecated
            ? i18n.translate('xpack.security.management.roles.reservedDeprecatedRoleIconLabel', {
                defaultMessage: 'Deprecated reserved role',
              })
            : i18n.translate('xpack.security.management.roles.reservedRoleIconLabel', {
                defaultMessage: 'Reserved role',
              });

          return isReservedRole(record) ? (
            <span title={label}>
              <EuiIcon
                aria-label={label}
                data-test-subj="reservedRole"
                type={isDeprecated ? 'alert' : 'check'}
              />
            </span>
          ) : null;
        },
      },
      {
        name: i18n.translate('xpack.security.management.roles.actionsColumnName', {
          defaultMessage: 'Actions',
        }),
        width: '150px',
        actions: [
          {
            available: (role: Role) => !isReadOnlyRole(role),
            render: (role: Role) => {
              const title = i18n.translate('xpack.security.management.roles.editRoleActionName', {
                defaultMessage: `Edit {roleName}`,
                values: { roleName: role.name },
              });

              return (
                <EuiButtonIcon
                  aria-label={title}
                  data-test-subj={`edit-role-action-${role.name}`}
                  title={title}
                  color={'primary'}
                  iconType={'pencil'}
                  href={getRoleManagementHref('edit', role.name)}
                />
              );
            },
          },
          {
            available: (role: Role) => !isReservedRole(role),
            render: (role: Role) => {
              const title = i18n.translate('xpack.security.management.roles.cloneRoleActionName', {
                defaultMessage: `Clone {roleName}`,
                values: { roleName: role.name },
              });

              return (
                <EuiButtonIcon
                  aria-label={title}
                  data-test-subj={`clone-role-action-${role.name}`}
                  title={title}
                  color={'primary'}
                  iconType={'copy'}
                  href={getRoleManagementHref('clone', role.name)}
                />
              );
            },
          },
        ],
      },
    ] as Array<EuiBasicTableColumn<Role>>;
  };

  private getVisibleRoles = () => {
    const { roles, filter = '', includeReservedRoles } = this.state;

    return roles.filter(role => {
      const normalized = `${role.name}`.toLowerCase();
      const normalizedQuery = filter.toLowerCase();
      return (
        normalized.indexOf(normalizedQuery) !== -1 &&
        (includeReservedRoles || !isReservedRole(role))
      );
    });
  };

  private onIncludeReservedRolesChange = (e: EuiSwitchEvent) => {
    this.setState({
      includeReservedRoles: e.target.checked,
    });
  };

  private handleDelete = () => {
    this.setState({
      selection: [],
      showDeleteConfirmation: false,
    });
    this.loadRoles();
  };

  private async loadRoles() {
    try {
      const roles = await this.props.rolesAPIClient.getRoles();

      this.setState({ roles });
    } catch (e) {
      if (_.get(e, 'body.statusCode') === 403) {
        this.setState({ permissionDenied: true });
      } else {
        this.props.notifications.toasts.addDanger(
          i18n.translate('xpack.security.management.roles.fetchingRolesErrorMessage', {
            defaultMessage: 'Error fetching roles: {message}',
            values: { message: _.get(e, 'body.message', '') },
          })
        );
      }
    }
  }

  private renderToolsLeft() {
    const { selection } = this.state;
    if (selection.length === 0) {
      return;
    }
    const numSelected = selection.length;
    return (
      <EuiButton
        data-test-subj="deleteRoleButton"
        color="danger"
        onClick={() => this.setState({ showDeleteConfirmation: true })}
      >
        <FormattedMessage
          id="xpack.security.management.roles.deleteSelectedRolesButtonLabel"
          defaultMessage="Delete {numSelected} role{numSelected, plural, one { } other {s}}"
          values={{
            numSelected,
          }}
        />
      </EuiButton>
    );
  }
  private renderToolsRight() {
    return (
      <EuiSwitch
        label={
          <FormattedMessage
            id="xpack.security.management.roles.showReservedRolesLabel"
            defaultMessage="Show reserved roles"
          />
        }
        checked={this.state.includeReservedRoles}
        onChange={this.onIncludeReservedRolesChange}
      />
    );
  }
  private onCancelDelete = () => {
    this.setState({ showDeleteConfirmation: false });
  };
}
