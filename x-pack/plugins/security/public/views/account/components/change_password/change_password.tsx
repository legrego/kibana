/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  EuiButton,
  // @ts-ignore
  EuiButtonEmpty,
  // @ts-ignore
  EuiDescribedFormGroup,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { UserAPIClient } from 'plugins/security/lib/api';
import React, { ChangeEvent, Component } from 'react';
import { toastNotifications } from 'ui/notify';
import { User } from '../../../../../common/model/user';

interface Props {
  user: User;
}

interface State {
  shouldValidate: boolean;
  showForm: boolean;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  currentPasswordError: boolean;
  changeInProgress: boolean;
}

function getInitialState(): State {
  return {
    shouldValidate: false,
    showForm: false,
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    currentPasswordError: false,
    changeInProgress: false,
  };
}

export class ChangePassword extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = getInitialState();
  }

  public render() {
    const changePasswordTitle = (
      <FormattedMessage
        id="xpack.security.account.changePasswordTitle"
        defaultMessage="Change password"
      />
    );
    return (
      <EuiDescribedFormGroup
        title={<h3>{changePasswordTitle}</h3>}
        description={
          <p>
            <FormattedMessage
              id="xpack.security.account.changePasswordDescription"
              defaultMessage="Change the password used to sign in to your account."
            />
          </p>
        }
      >
        <EuiFormRow hasEmptyLabelSpace={true}>
          {this.state.showForm ? (
            this.getForm()
          ) : (
            <EuiButtonEmpty onClick={() => this.setState({ showForm: true })}>
              {changePasswordTitle}
            </EuiButtonEmpty>
          )}
        </EuiFormRow>
      </EuiDescribedFormGroup>
    );
  }

  private getForm = () => {
    return (
      <EuiForm>
        <EuiFormRow
          {...this.validateCurrentPassword()}
          label={
            <FormattedMessage
              id="xpack.security.account.changePasswordForm.currentPasswordLabel"
              defaultMessage="Current password"
            />
          }
        >
          <EuiFieldText
            type="password"
            value={this.state.currentPassword}
            onChange={this.onCurrentPasswordChange}
            disabled={this.state.changeInProgress}
          />
        </EuiFormRow>
        <EuiFormRow
          {...this.validateNewPassword()}
          label={
            <FormattedMessage
              id="xpack.security.account.changePasswordForm.newPasswordLabel"
              defaultMessage="New password"
            />
          }
        >
          <EuiFieldText
            type="password"
            value={this.state.newPassword}
            onChange={this.onNewPasswordChange}
            disabled={this.state.changeInProgress}
          />
        </EuiFormRow>
        <EuiFormRow
          {...this.validateConfirmPassword()}
          label={
            <FormattedMessage
              id="xpack.security.account.changePasswordForm.confirmPasswordLabel"
              defaultMessage="Confirm password"
            />
          }
        >
          <EuiFieldText
            type="password"
            value={this.state.confirmPassword}
            onChange={this.onConfirmPasswordChange}
            disabled={this.state.changeInProgress}
          />
        </EuiFormRow>
        <EuiFormRow>
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem>
              <EuiButton onClick={this.onCancelClick} isDisabled={this.state.changeInProgress}>
                <FormattedMessage
                  id="xpack.security.account.changePasswordForm.cancelButtonLabel"
                  defaultMessage="Cancel"
                />
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiButton
                onClick={this.onChangePasswordClick}
                fill
                isLoading={this.state.changeInProgress}
              >
                <FormattedMessage
                  id="xpack.security.account.changePasswordForm.saveChangesButtonLabel"
                  defaultMessage="Save changes"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>
      </EuiForm>
    );
  };

  private onCurrentPasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    this.setState({ currentPassword: e.target.value, currentPasswordError: false });
  };

  private onNewPasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    this.setState({ newPassword: e.target.value });
  };

  private onConfirmPasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    this.setState({ confirmPassword: e.target.value });
  };

  private onCancelClick = () => {
    this.setState(getInitialState());
  };

  private onChangePasswordClick = async () => {
    const { isInvalid } = this.validateForm();

    this.setState({ shouldValidate: true, currentPasswordError: false });

    if (isInvalid) {
      return;
    }

    this.setState({ changeInProgress: true }, () => this.performPasswordChange());
  };

  private validateCurrentPassword = (shouldValidate = this.state.shouldValidate) => {
    if (!shouldValidate) {
      return {
        isInvalid: false,
      };
    }

    if (this.state.currentPasswordError) {
      return {
        isInvalid: true,
        error: (
          <FormattedMessage
            id="xpack.security.account.changePasswordForm.invalidPassword"
            defaultMessage="Password is incorrect"
          />
        ),
      };
    }

    if (!this.state.currentPassword) {
      return {
        isInvalid: true,
        error: (
          <FormattedMessage
            id="xpack.security.account.currentPasswordRequired"
            defaultMessage="Please enter your current password"
          />
        ),
      };
    }

    return {
      isInvalid: false,
    };
  };

  private validateNewPassword = (shouldValidate = this.state.shouldValidate) => {
    const { newPassword } = this.state;
    const minPasswordLength = 6;
    if (shouldValidate && newPassword.length < minPasswordLength) {
      return {
        isInvalid: true,
        error: (
          <FormattedMessage
            id="xpack.security.account.passwordLengthDescription"
            defaultMessage="Password must be at least {minPasswordLength} characters"
            values={{
              minPasswordLength,
            }}
          />
        ),
      };
    }

    return {
      isInvalid: false,
    };
  };

  private validateConfirmPassword = (shouldValidate = this.state.shouldValidate) => {
    const { newPassword, confirmPassword } = this.state;
    if (shouldValidate && newPassword !== confirmPassword) {
      return {
        isInvalid: true,
        error: (
          <FormattedMessage
            id="xpack.security.account.passwordsDoNotMatch"
            defaultMessage="Passwords to not match"
          />
        ),
      };
    }

    return {
      isInvalid: false,
    };
  };

  private validateForm = () => {
    const validation = [
      this.validateCurrentPassword(true),
      this.validateNewPassword(true),
      this.validateConfirmPassword(true),
    ];

    const firstFailure = validation.find(result => result.isInvalid);
    if (firstFailure) {
      return firstFailure;
    }

    return {
      isInvalid: false,
    };
  };

  private performPasswordChange = async () => {
    try {
      await UserAPIClient.changePassword(
        this.props.user.username,
        this.state.newPassword,
        this.state.currentPassword
      );
      this.handleChangePasswordSuccess();
    } catch (e) {
      this.handleChangePasswordFailure(e);
    } finally {
      this.setState({
        changeInProgress: false,
      });
    }
  };

  private handleChangePasswordSuccess = () => {
    toastNotifications.addSuccess(
      i18n.translate('xpack.security.account.changePasswordSuccess', {
        defaultMessage: 'Your password has been changed',
      })
    );
    this.setState({
      currentPasswordError: false,
      shouldValidate: false,
      showForm: false,
    });
  };

  private handleChangePasswordFailure = (error: Record<string, any>) => {
    if (error.body && error.body.statusCode === 401) {
      this.setState({ currentPasswordError: true });
    } else {
      toastNotifications.addDanger(
        i18n.translate('xpack.security.management.users.editUser.settingPasswordErrorMessage', {
          defaultMessage: 'Error setting password: {message}',
          values: { message: _.get(error, 'body.message') },
        })
      );
    }
  };
}
