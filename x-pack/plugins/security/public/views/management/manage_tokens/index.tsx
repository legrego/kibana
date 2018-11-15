/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
// @ts-ignore
import { checkLicenseError } from 'plugins/security/lib/check_license_error';
import 'plugins/security/services/application_privilege';
import 'plugins/security/services/shield_indices';
import 'plugins/security/services/shield_privileges';
import 'plugins/security/services/shield_role';
import 'plugins/security/services/shield_user';
// @ts-ignore
import template from 'plugins/security/views/management/manage_tokens/manage_tokens.html';
// @ts-ignore
import { XPackInfoProvider } from 'plugins/xpack_main/services/xpack_info';
// @ts-ignore
import { fatalError } from 'ui/notify';
import routes from 'ui/routes';
import { MANAGE_TOKENS_PATH } from '../management_urls';

import { ManageTokensPage } from './components';

import { I18nProvider } from '@kbn/i18n/react';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

routes.when(`${MANAGE_TOKENS_PATH}/:name?`, {
  template,
  resolve: {},
  // @ts-ignore
  controllerAs: 'manageTokens',
  controller($injector, $scope, $http, enableSpaceAwarePrivileges) {
    const $route = $injector.get('$route');
    const Private = $injector.get('Private');

    $scope.$$postDigest(() => {
      const domNode = document.getElementById('manageTokensReactRoot');

      render(
        <I18nProvider>
          <ManageTokensPage />
        </I18nProvider>,
        domNode
      );

      // unmount react on controller destroy
      $scope.$on('$destroy', () => {
        if (domNode) {
          unmountComponentAtNode(domNode);
        }
      });
    });
  },
});
