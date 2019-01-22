/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InjectedIntl } from '@kbn/i18n/react';
import React, { Component } from 'react';
import { UICapabilities } from 'ui/capabilities';
import { Feature } from 'x-pack/plugins/xpack_main/types';
import { Space } from '../../../../../../../../spaces/common/model/space';
import { PrivilegeDefinition, Role } from '../../../../../../../common/model';
import { KibanaPrivilegeCalculatorFactory } from '../../../../../../lib/kibana_privilege_calculator';
import { RoleValidator } from '../../../lib/validate_role';
import { CollapsiblePanel } from '../../collapsible_panel';
import { SimplePrivilegeSection } from './simple_privilege_section';
import { SpaceAwarePrivilegeSection } from './space_aware_privilege_section';
import { TransformErrorSection } from './transform_error_section';

interface Props {
  role: Role;
  spacesEnabled: boolean;
  spaces?: Space[];
  uiCapabilities: UICapabilities;
  features: Feature[];
  editable: boolean;
  privilegeDefinition: PrivilegeDefinition;
  onChange: (role: Role) => void;
  validator: RoleValidator;
  intl: InjectedIntl;
}

export class KibanaPrivileges extends Component<Props, {}> {
  public render() {
    return (
      <CollapsiblePanel iconType={'logoKibana'} title={'Kibana'}>
        {this.getForm()}
      </CollapsiblePanel>
    );
  }

  public getForm = () => {
    const {
      privilegeDefinition,
      role,
      spacesEnabled,
      spaces = [],
      uiCapabilities,
      onChange,
      editable,
      validator,
      features,
    } = this.props;

    if (role._transform_error && role._transform_error.includes('kibana')) {
      return <TransformErrorSection />;
    }

    const privilegeCalculatorFactory = new KibanaPrivilegeCalculatorFactory(privilegeDefinition);

    if (spacesEnabled) {
      return (
        <SpaceAwarePrivilegeSection
          privilegeDefinition={privilegeDefinition}
          role={role}
          privilegeCalculatorFactory={privilegeCalculatorFactory}
          spaces={spaces}
          uiCapabilities={uiCapabilities}
          features={features}
          onChange={onChange}
          editable={editable}
          validator={validator}
        />
      );
    } else {
      return (
        <SimplePrivilegeSection
          privilegeDefinition={privilegeDefinition}
          features={features}
          role={role}
          privilegeCalculatorFactory={privilegeCalculatorFactory}
          onChange={onChange}
          editable={editable}
          intl={this.props.intl}
        />
      );
    }
  };
}
