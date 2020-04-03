/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useState } from 'react';
import { EuiButton, EuiText } from '@elastic/eui';
import { NotificationsStart } from 'src/core/public';
import { EuiFormRow, EuiFieldText } from '@elastic/eui';
import { EuiSpacer } from '@elastic/eui';
import { ApiKey } from '../../../../common/model';
import { APIKeysAPIClient } from '../api_keys_api_client';

interface Props {
  apiClient: PublicMethodsOf<APIKeysAPIClient>;
  onAPIKeyCreated: (apiKey: ApiKey) => void;
  toasts: NotificationsStart['toasts'];
}

export const CreateAPIKeyForm = ({ apiClient, onAPIKeyCreated, toasts }: Props) => {
  const [createInProgress, setCreateInProgress] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [validateForm, setValidateForm] = useState(false);

  const onApiKeyNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newName = e.target.value;
      setKeyName(newName);
      if (!validateForm) {
        setValidateForm(true);
      }
    },
    [validateForm]
  );

  const validateName = useCallback((name: string) => {
    if (!name) {
      return {
        isInvalid: true,
        error: 'Name is required.',
      };
    }
    return {
      isInvalid: false,
    };
  }, []);

  const onCreateAPIKey = useCallback(() => {
    const onCreateSuccess = (apiKey: ApiKey) => {
      setCreateInProgress(false);
      onAPIKeyCreated(apiKey);
    };

    const onCreateError = (error: any) => {
      setCreateInProgress(false);
      toasts.addDanger({
        title: 'Error creating API Key',
        text: error?.body?.message ?? 'Unknown error',
      });
    };

    setValidateForm(true);

    if (validateName(keyName).isInvalid) {
      return;
    }

    setCreateInProgress(true);
    apiClient
      .createApiKey(keyName)
      .then(onCreateSuccess)
      .catch(onCreateError);
  }, [apiClient, keyName, onAPIKeyCreated, toasts, validateName]);

  const onFormSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      onCreateAPIKey();
    },
    [onCreateAPIKey]
  );

  return (
    <form onSubmit={onFormSubmit}>
      <EuiFormRow label="API Key Name" compressed {...(validateForm && validateName(keyName))}>
        <EuiFieldText
          disabled={createInProgress}
          value={keyName}
          onChange={onApiKeyNameChange}
          compressed
        />
      </EuiFormRow>
      <EuiSpacer />
      <EuiFormRow compressed>
        <EuiText size="s">
          <p>
            This API Key will have the same privileges as your account. Changes to your privileges
            are not reflected in this key.
          </p>
        </EuiText>
      </EuiFormRow>
      <EuiSpacer />
      <EuiFormRow compressed>
        <EuiButton
          onClick={onCreateAPIKey}
          isLoading={createInProgress}
          disabled={createInProgress}
          fill
        >
          Create
        </EuiButton>
      </EuiFormRow>
    </form>
  );
};
