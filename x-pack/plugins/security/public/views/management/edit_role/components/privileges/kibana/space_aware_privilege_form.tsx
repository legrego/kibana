/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  // @ts-ignore
  EuiDescribedFormGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import React, { Component, Fragment } from 'react';
import { Space } from '../../../../../../../../spaces/common/model/space';
import { KibanaPrivilege } from '../../../../../../../common/model/kibana_privilege';
import { Role } from '../../../../../../../common/model/role';
import { isReservedRole } from '../../../../../../lib/role';
import { NO_PRIVILEGE_VALUE } from '../../../lib/constants';
import { copyRole } from '../../../lib/copy_role';
import { getAvailablePrivileges } from '../../../lib/get_available_privileges';
import { RoleValidator } from '../../../lib/validate_role';
import { ImpactedSpacesFlyout } from './impacted_spaces_flyout';
import { PrivilegeCalloutWarning } from './privilege_callout_warning';
import { PrivilegeSelector } from './privilege_selector';
import { PrivilegeSpaceForm } from './privilege_space_form';
import { PrivilegeSpaceTable } from './privilege_space_table';

interface Props {
  kibanaAppPrivileges: KibanaPrivilege[];
  role: Role;
  spaces: Space[];
  onChange: (role: Role) => void;
  editable: boolean;
  validator: RoleValidator;
}

interface PrivilegeForm {
  spaces: string[];
  privilege: KibanaPrivilege | null;
}

interface SpacePrivileges {
  [spaceId: string]: KibanaPrivilege[];
}

interface State {
  spacePrivileges: SpacePrivileges;
  privilegeForms: PrivilegeForm[];
}

export class SpaceAwarePrivilegeForm extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    const { role } = props;

    const assignedPrivileges = role.kibana;
    const spacePrivileges = {
      ...assignedPrivileges.space,
    };

    this.state = {
      spacePrivileges,
      privilegeForms: [],
    };
  }

  public render() {
    const { kibanaAppPrivileges, role } = this.props;

    const assignedPrivileges = role.kibana;

    const basePrivilege =
      assignedPrivileges.global.length > 0 ? assignedPrivileges.global[0] : NO_PRIVILEGE_VALUE;

    const description = (
      <p>
        Specifies the lowest permission level for all spaces, unless a custom privilege is
        specified.
      </p>
    );

    let helptext;
    if (basePrivilege === NO_PRIVILEGE_VALUE) {
      helptext = 'No access';
    } else if (basePrivilege === 'all') {
      helptext = 'View, edit, and share all objects and apps within all spaces';
    } else if (basePrivilege === 'read') {
      helptext = 'View only mode';
    }

    return (
      <Fragment>
        <EuiDescribedFormGroup title={<h3>Minimum privilege</h3>} description={description}>
          <EuiFormRow hasEmptyLabelSpace helpText={helptext}>
            <PrivilegeSelector
              data-test-subj={'kibanaMinimumPrivilege'}
              availablePrivileges={kibanaAppPrivileges}
              value={basePrivilege}
              disabled={isReservedRole(role)}
              allowNone={true}
              onChange={this.onKibanaBasePrivilegeChange}
            />
          </EuiFormRow>
        </EuiDescribedFormGroup>

        <EuiSpacer />

        {this.renderSpacePrivileges(basePrivilege, kibanaAppPrivileges)}
      </Fragment>
    );
  }

  public renderSpacePrivileges = (
    basePrivilege: KibanaPrivilege,
    availablePrivileges: KibanaPrivilege[]
  ) => {
    const { role, spaces } = this.props;

    const { spacePrivileges } = this.state;

    const availableSpaces = this.getAvailableSpaces();

    const canAssignSpacePrivileges = basePrivilege !== 'all';
    const hasAssignedSpacePrivileges = Object.keys(this.state.spacePrivileges).length > 0;

    const showAddPrivilegeButton =
      canAssignSpacePrivileges && this.props.editable && availableSpaces.length > 0;

    return (
      <Fragment>
        <EuiTitle size={'xs'}>
          <h3>Space privileges</h3>
        </EuiTitle>
        <EuiSpacer size={'s'} />
        <EuiText
          // @ts-ignore
          grow={false}
          size={'s'}
          color={'subdued'}
        >
          <p>
            Customize permission levels per space. If a space is not customized, its permissions
            will default to the minimum privilege specified above.
          </p>
          {basePrivilege !== 'all' &&
            this.props.editable && (
              <p>
                You can bulk-create space privileges though they will be saved individually upon
                saving the role.
              </p>
            )}
        </EuiText>

        {(basePrivilege !== NO_PRIVILEGE_VALUE || isReservedRole(this.props.role)) && (
          <PrivilegeCalloutWarning
            basePrivilege={basePrivilege}
            isReservedRole={isReservedRole(this.props.role)}
          />
        )}

        {basePrivilege === 'read' && this.props.editable && <EuiSpacer />}

        {canAssignSpacePrivileges && (
          <Fragment>
            <PrivilegeSpaceTable
              role={role}
              spaces={spaces}
              availablePrivileges={availablePrivileges}
              spacePrivileges={spacePrivileges}
              onChange={this.onExistingSpacePrivilegesChange}
            />

            {hasAssignedSpacePrivileges && <EuiSpacer />}

            {this.getSpaceForms(basePrivilege)}
          </Fragment>
        )}

        <EuiFlexGroup
          // @ts-ignore
          alignItems={'baseline'}
        >
          {showAddPrivilegeButton && (
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="addSpacePrivilegeButton"
                size={'s'}
                iconType={'plusInCircle'}
                onClick={this.addSpacePrivilege}
              >
                Add space privilege
              </EuiButton>
            </EuiFlexItem>
          )}
          <EuiFlexItem>
            <ImpactedSpacesFlyout role={role} spaces={spaces} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </Fragment>
    );
  };

  public getSpaceForms = (basePrivilege: KibanaPrivilege) => {
    if (!this.props.editable) {
      return null;
    }

    return this.state.privilegeForms.map((form, index) =>
      this.getSpaceForm(form, index, basePrivilege)
    );
  };

  public addSpacePrivilege = () => {
    this.setState({
      privilegeForms: [
        ...this.state.privilegeForms,
        {
          spaces: [],
          privilege: null,
        },
      ],
    });
  };

  public getAvailableSpaces = (omitIndex?: number): Space[] => {
    const { spacePrivileges } = this.state;

    return this.props.spaces.filter(space => {
      const alreadyAssigned = Object.keys(spacePrivileges).indexOf(space.id) >= 0;

      if (alreadyAssigned) {
        return false;
      }

      const otherForms = [...this.state.privilegeForms];
      if (typeof omitIndex === 'number') {
        otherForms.splice(omitIndex, 1);
      }

      const inAnotherForm = otherForms.some(({ spaces }) => spaces.indexOf(space.id) >= 0);

      return !inAnotherForm;
    });
  };

  public getSpaceForm = (form: PrivilegeForm, index: number, basePrivilege: KibanaPrivilege) => {
    const { spaces: selectedSpaceIds, privilege } = form;

    const availableSpaces = this.getAvailableSpaces(index);

    return (
      <Fragment key={index}>
        <PrivilegeSpaceForm
          key={index}
          availableSpaces={availableSpaces}
          selectedSpaceIds={selectedSpaceIds}
          availablePrivileges={getAvailablePrivileges(basePrivilege)}
          selectedPrivilege={privilege}
          onChange={this.onPrivilegeSpacePermissionChange(index)}
          onDelete={this.onPrivilegeSpacePermissionDelete(index)}
          validator={this.props.validator}
        />
        <EuiSpacer />
      </Fragment>
    );
  };

  public onPrivilegeSpacePermissionChange = (index: number) => (form: PrivilegeForm) => {
    const existingPrivilegeForm = { ...this.state.privilegeForms[index] };
    const updatedPrivileges = [...this.state.privilegeForms];
    updatedPrivileges[index] = {
      spaces: form.spaces,
      privilege: form.privilege,
    };

    this.setState({
      privilegeForms: updatedPrivileges,
    });

    const role = copyRole(this.props.role);

    if (!form.spaces.length || !form.privilege) {
      existingPrivilegeForm.spaces.forEach(spaceId => {
        role.kibana.space[spaceId] = [];
      });
    } else {
      const privilege = form.privilege;
      if (privilege) {
        form.spaces.forEach(spaceId => {
          role.kibana.space[spaceId] = [privilege];
        });
      }
    }

    this.props.validator.setInProgressSpacePrivileges(updatedPrivileges);
    this.props.onChange(role);
  };

  public onPrivilegeSpacePermissionDelete = (index: number) => () => {
    const updatedPrivileges = [...this.state.privilegeForms];
    const removedPrivilege = updatedPrivileges.splice(index, 1)[0];

    this.setState({
      privilegeForms: updatedPrivileges,
    });

    const role = copyRole(this.props.role);

    removedPrivilege.spaces.forEach(spaceId => {
      delete role.kibana.space[spaceId];
    });

    this.props.onChange(role);
  };

  public onExistingSpacePrivilegesChange = (assignedPrivileges: SpacePrivileges) => {
    const role = copyRole(this.props.role);

    role.kibana.space = assignedPrivileges;

    this.setState({
      spacePrivileges: assignedPrivileges,
    });

    this.props.onChange(role);
  };

  public onKibanaBasePrivilegeChange = (privilege: KibanaPrivilege) => {
    const role = copyRole(this.props.role);

    // Remove base privilege value
    role.kibana.global = [];

    if (privilege !== NO_PRIVILEGE_VALUE) {
      role.kibana.global = [privilege];
    }

    this.props.onChange(role);
  };
}
