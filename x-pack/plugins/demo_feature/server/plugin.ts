/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from '../../../../src/core/server';
import { PluginSetupContract as FeaturesPluginSetup } from '../../features/server';

export interface PluginsSetup {
  features: FeaturesPluginSetup;
}

export class Plugin {
  public setup(core: CoreSetup, plugins: PluginsSetup) {
    plugins.features.registerFeature({
      id: 'demoFeature',
      name: 'Demo Feature',
      app: ['demoFeatureApp'],
      navLinkId: 'demoFeature',
      privileges: {
        all: {
          app: ['demoFeatureApp'],
          api: [],
          savedObject: {
            all: [],
            read: [],
          },
          ui: ['showAll'],
        },
        read: {
          app: ['demoFeatureApp'],
          api: [],
          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        },
      },
    });
  }

  public start() {}

  public stop() {}
}
