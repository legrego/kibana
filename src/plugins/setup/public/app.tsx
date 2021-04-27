/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiPageTemplate,
  EuiFlexGrid,
  EuiButton,
  EuiFlexItem,
  EuiPanel,
  EuiText,
} from '@elastic/eui';
import React from 'react';

export const App = () => {
  return (
    <EuiPageTemplate
      restrictWidth={false}
      template="empty"
      pageHeader={{
        iconType: 'logoElastic',
        pageTitle: 'Welcome to Elastic',
        rightSideItems: [<EuiButton>Do something</EuiButton>],
      }}
    >
      <EuiFlexGrid columns={2}>
        <EuiFlexItem>
          <EuiPanel style={{ height: 200 }}>
            <EuiButton size="m">Click me</EuiButton>
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPanel style={{ height: 200 }}>
            <EuiText>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas eu tellus vitae
              velit mollis fermentum quis sit amet libero. Nullam ultrices sapien quis ornare
              laoreet. Maecenas pharetra elementum ultrices. Vestibulum ut augue a velit congue
              posuere commodo eu nisi. Nulla facilisi. Vestibulum iaculis tempor dignissim. Fusce
              turpis risus, venenatis sed ornare venenatis, facilisis id arcu.
            </EuiText>
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPanel style={{ height: 200 }}>
            <EuiText>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas eu tellus vitae
              velit mollis fermentum quis sit amet libero. Nullam ultrices sapien quis ornare
              laoreet. Maecenas pharetra elementum ultrices. Vestibulum ut augue a velit congue
              posuere commodo eu nisi. Nulla facilisi. Vestibulum iaculis tempor dignissim. Fusce
              turpis risus, venenatis sed ornare venenatis, facilisis id arcu.
            </EuiText>
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPanel style={{ height: 200 }}>
            <EuiButton size="m" color={'danger'}>
              DANGER Button
            </EuiButton>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGrid>
    </EuiPageTemplate>
  );
};
