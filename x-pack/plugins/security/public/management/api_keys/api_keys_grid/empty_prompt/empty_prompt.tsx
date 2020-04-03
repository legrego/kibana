/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { NotificationsStart } from 'src/core/public';
import { DocumentationLinksService } from '../../documentation_links';
import { CreateAPIKeyButton } from '../../create_api_key_button';
import { APIKeysAPIClient } from '../../api_keys_api_client';

interface Props {
  isAdmin: boolean;
  docLinks: DocumentationLinksService;
  apiClient: PublicMethodsOf<APIKeysAPIClient>;
  toasts: NotificationsStart['toasts'];
  onAPIKeyCreated: () => void;
}

export const EmptyPrompt: React.FunctionComponent<Props> = ({
  isAdmin,
  docLinks,
  apiClient,
  toasts,
  onAPIKeyCreated,
}) => (
  <EuiEmptyPrompt
    iconType="managementApp"
    title={
      <h1 data-test-subj="noApiKeysHeader">
        {isAdmin ? (
          <FormattedMessage
            id="xpack.security.management.apiKeys.table.emptyPromptAdminTitle"
            defaultMessage="No API keys"
          />
        ) : (
          <FormattedMessage
            id="xpack.security.management.apiKeys.table.emptyPromptNonAdminTitle"
            defaultMessage="You don't have any API keys"
          />
        )}
      </h1>
    }
    body={
      <Fragment>
        <p>
          <FormattedMessage
            id="xpack.security.management.apiKeys.table.emptyPromptDescription"
            defaultMessage="You can create an API Key based on your account's privileges."
          />
        </p>
      </Fragment>
    }
    actions={
      <CreateAPIKeyButton apiClient={apiClient} onAPIKeyCreated={onAPIKeyCreated} toasts={toasts} />
    }
    data-test-subj="emptyPrompt"
  />
);
