/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {
  EuiHorizontalRule,
  EuiIcon,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

const App = () => {
  return (
    <EuiPage>
      <EuiPageBody>
        <div style={{ width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <EuiIcon type="logoElastic" size="xxl" />
          </div>
          <div style={{ textAlign: 'center' }}>
            <EuiTitle>
              <h1>Configure Elastic to get started.</h1>
            </EuiTitle>
          </div>
        </div>
        <EuiHorizontalRule />
        <EuiPageContent>
          <EuiText>Hello world!</EuiText>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};

const setupApp = {
  init: () => {
    document.body.textContent = '';
    ReactDOM.render(<App />, document.body);
  },
};

export { setupApp };
