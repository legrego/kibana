/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiOverlayMask,
  EuiModal,
} from '@elastic/eui';
import { NotificationsStart } from 'src/core/public';
import { EuiPopover } from '@elastic/eui';
import { ApiKey } from '../../../../common/model';
import { APIKeysAPIClient } from '../api_keys_api_client';
import { CreateAPIKeyForm } from '../create_api_key_form';

interface Props {
  apiClient: PublicMethodsOf<APIKeysAPIClient>;
  onAPIKeyCreated: (apiKey: ApiKey) => void;
  toasts: NotificationsStart['toasts'];
}

export const CreateAPIKeyButton = ({ apiClient, onAPIKeyCreated, toasts }: Props) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const createKeyButton = (
    <EuiButton data-test-subj="createApiKeyButton" onClick={() => setIsModalOpen(!isModalOpen)}>
      Create API Key
    </EuiButton>
  );

  return (
    <>
      {createKeyButton}
      {isModalOpen && (
        <EuiOverlayMask>
          <EuiModal onClose={() => setIsModalOpen(false)}>
            <EuiModalHeader>
              <EuiModalHeaderTitle>Create API Key</EuiModalHeaderTitle>
            </EuiModalHeader>
            <EuiModalBody>
              <CreateAPIKeyForm
                apiClient={apiClient}
                toasts={toasts}
                onAPIKeyCreated={apiKey => {
                  setIsModalOpen(false);
                  onAPIKeyCreated(apiKey);
                }}
              />
            </EuiModalBody>
          </EuiModal>
        </EuiOverlayMask>
      )}
    </>
  );

  return (
    <EuiPopover
      button={createKeyButton}
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      ownFocus
    >
      <CreateAPIKeyForm
        apiClient={apiClient}
        toasts={toasts}
        onAPIKeyCreated={apiKey => {
          setIsPopoverOpen(false);
          onAPIKeyCreated(apiKey);
        }}
      />
    </EuiPopover>
  );
};
