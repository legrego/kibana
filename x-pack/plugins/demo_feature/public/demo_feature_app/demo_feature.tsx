/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageHeader,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { CoreStart, ApplicationStart } from 'src/core/public';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { EuiFormRow, EuiSwitch } from '@elastic/eui';
import { EuiSpacer } from '@elastic/eui';

interface Props {
  capabilities: ApplicationStart['capabilities'];
}

export const DemoFeature = ({ capabilities }: Props) => {
  const canShowAll = capabilities.demoFeature.showAll;

  const [showingAll, setShowingAll] = useState(false);

  return (
    <EuiPage>
      <EuiPageBody>
        <EuiPageHeader>
          <EuiTitle size="l">
            <h1>Demo feature</h1>
          </EuiTitle>
        </EuiPageHeader>
        <EuiPageContent>
          {canShowAll && (
            <>
              <EuiFormRow>
                <EuiSwitch
                  label="Show all capabilities"
                  checked={showingAll}
                  onChange={e => setShowingAll(e.target.checked)}
                />
              </EuiFormRow>

              <EuiSpacer />
            </>
          )}
          <EuiFlexGroup>
            <EuiFlexItem>
              <div>
                <EuiText>
                  <p>Demo Feature Capabilties</p>
                </EuiText>
                <EuiText>
                  <pre>{JSON.stringify({ demoFeature: capabilities.demoFeature }, null, 2)}</pre>
                </EuiText>
              </div>
            </EuiFlexItem>
            {showingAll && (
              <EuiFlexItem>
                <div>
                  <EuiText>
                    <p>Full list of UI capabilities </p>
                  </EuiText>
                  <EuiText>
                    <pre>{JSON.stringify(capabilities, null, 2)}</pre>
                  </EuiText>
                </div>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};

export const renderDemoFeatureApp = (i18nStart: CoreStart['i18n'], el: Element, props: Props) => {
  ReactDOM.render(
    <i18nStart.Context>
      <DemoFeature {...props} />
    </i18nStart.Context>,
    el
  );
  return () => ReactDOM.unmountComponentAtNode(el);
};
