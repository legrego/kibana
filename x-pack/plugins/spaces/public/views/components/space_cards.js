/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import chrome from 'ui/chrome';
import { SpaceCard } from './space_card';
import { stripSpaceUrlContext } from '../../../common/spaces_url_parser';
import {
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import './space_cards.less';

export class SpaceCards extends Component {
  render() {
    return (
      <div className="spaceCards">
        <EuiFlexGroup gutterSize="l" justifyContent="spaceEvenly" wrap>
          {this.props.spaces.map(this.renderSpace)}
        </EuiFlexGroup>
      </div>
    );
  }

  renderSpace = (space) => (
    <EuiFlexItem key={space.id} grow={false}>
      <SpaceCard space={space} onClick={this.createSpaceClickHandler(space)} />
    </EuiFlexItem>
  );

  createSpaceClickHandler = (space) => {
    return () => {
      const baseUrlWithoutSpace = stripSpaceUrlContext(chrome.getBasePath());

      window.location = `${baseUrlWithoutSpace}/s/${space.urlContext}`;
    };
  };
}

SpaceCards.propTypes = {
  spaces: PropTypes.array.isRequired,
};
