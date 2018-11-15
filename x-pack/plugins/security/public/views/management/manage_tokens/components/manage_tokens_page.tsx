/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  EuiFlexGroup,
  EuiFlexItem,
  // @ts-ignore
  EuiForm,
  // @ts-ignore
  EuiInMemoryTable,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import React, { Component, Fragment } from 'react';

interface Props {
  intl: InjectedIntl;
}

interface State {
  loading: boolean;
}

class ManageTokensPageUI extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      loading: false,
    };
  }
  public render() {
    return (
      <EuiPage restrictWidth className="spcGridPage">
        <EuiPageBody>
          <EuiPageContent horizontalPosition="center">{this.getPageContent()}</EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    );
  }

  public getPageContent() {
    return (
      <Fragment>
        <EuiFlexGroup justifyContent={'spaceBetween'}>
          <EuiFlexItem grow={false}>
            <EuiText>
              <h1>
                <FormattedMessage
                  id="xpack.spaces.management.manageTokensPage.securityTokens"
                  defaultMessage="Security Tokens"
                />
              </h1>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size={'xl'} />

        <EuiInMemoryTable
          itemId={'id'}
          items={[]}
          columns={this.getColumnConfig()}
          hasActions
          pagination={true}
          search={{
            box: {
              placeholder: this.props.intl.formatMessage({
                id: 'xpack.spaces.management.manageTokensPage.searchPlaceholder',
                defaultMessage: 'Search',
              }),
            },
          }}
          loading={this.state.loading}
          message={
            this.state.loading ? (
              <FormattedMessage
                id="xpack.spaces.management.manageTokensPage.loadingTitle"
                defaultMessage="loading…"
              />
            ) : (
              undefined
            )
          }
        />
      </Fragment>
    );
  }

  public getColumnConfig = () => {
    return [
      {
        field: 'token',
        name: 'Token',
      },
    ];
  };
}

export const ManageTokensPage = injectI18n(ManageTokensPageUI);
