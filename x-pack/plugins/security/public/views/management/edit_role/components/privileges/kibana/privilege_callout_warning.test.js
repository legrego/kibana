/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';
import { PrivilegeCalloutWarning } from './privilege_callout_warning';

describe('PrivilegeCalloutWarning', () => {
  it('renders without crashing', () => {
    expect(mount(<PrivilegeCalloutWarning role={{}} spaces={[]} basePrivilege={'all'} isReservedRole={false} />)).toMatchSnapshot();
  });
});
