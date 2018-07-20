/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  EuiSelect
} from '@elastic/eui';
import { NO_PRIVILEGE_VALUE } from '../../../lib/constants';


export class PrivilegeSelector extends Component {
  static propTypes = {
    kibanaPrivileges: PropTypes.array.isRequired,
    onChange: PropTypes.func.isRequired,
    value: PropTypes.string,
    allowNone: PropTypes.bool,
    disabled: PropTypes.bool,
  };

  state = {}

  render() {
    const {
      kibanaPrivileges,
      value,
      disabled,
      allowNone,
    } = this.props;

    const options = [];
    if (allowNone) {
      options.push({ value: NO_PRIVILEGE_VALUE, text: 'none' });
    }

    options.push(...kibanaPrivileges.map(p => ({
      value: p,
      text: p
    })));

    return (
      <EuiSelect
        options={options}
        hasNoInitialSelection={!allowNone}
        value={value || ''}
        onChange={this.onChange}
        disabled={disabled}
      />
    );
  }

  onChange = (e) => {
    this.props.onChange(e.target.value);
  }
}
