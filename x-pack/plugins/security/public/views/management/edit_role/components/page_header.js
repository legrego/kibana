/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';

import {
  EuiBreadcrumbs,
  EuiSpacer,
} from '@elastic/eui';

export class PageHeader extends Component {
  render() {
    return (
      <div>
        <EuiBreadcrumbs breadcrumbs={this.props.breadcrumbs.map(this.buildBreadcrumb)} />
        <EuiSpacer />
      </div>
    );
  }

  buildBreadcrumb = (breadcrumb) => {
    return {
      text: breadcrumb.display,
      href: breadcrumb.href,
    };
  }
}

PageHeader.propTypes = {
  breadcrumbs: PropTypes.array.isRequired
};
