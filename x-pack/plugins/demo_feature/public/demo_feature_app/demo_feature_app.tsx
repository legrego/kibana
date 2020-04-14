/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { StartServicesAccessor, ApplicationSetup, AppMountParameters } from 'src/core/public';

interface CreateDeps {
  application: ApplicationSetup;
  getStartServices: StartServicesAccessor;
}

export const demoFeatureApp = Object.freeze({
  id: 'demoFeatureApp',
  create({ application, getStartServices }: CreateDeps) {
    application.register({
      id: this.id,
      title: 'Demo Feature',
      mount: async (params: AppMountParameters) => {
        const [[coreStart], { renderDemoFeatureApp }] = await Promise.all([
          getStartServices(),
          import('./demo_feature'),
        ]);
        return renderDemoFeatureApp(coreStart.i18n, params.element, {
          capabilities: coreStart.application.capabilities,
        });
      },
    });
  },
});
