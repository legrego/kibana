/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink, EuiText } from '@elastic/eui';
import React, { Fragment } from 'react';
import { UserProfile } from 'x-pack/common/user_profile';

interface Props {
  userProfile: UserProfile;
}

export const SecureSpaceMessage = (props: Props) => {
  if (props.userProfile.hasCapability('manageSecurity')) {
    return (
      <Fragment>
        <EuiText className="eui-textCenter">
          <p>
            Want to assign a role to a space? Go to Management and select{' '}
            <EuiLink href="#/management/security/roles">Roles</EuiLink>.
          </p>
        </EuiText>
      </Fragment>
    );
  }
  return null;
};
