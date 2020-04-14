/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from 'src/core/public';
import { FeaturesPluginSetup } from '../../features/public';
import { demoFeatureApp } from './demo_feature_app';

export class DemoFeaturePlugin {
  public setup(core: CoreSetup, plugins: { feature: FeaturesPluginSetup }) {
    demoFeatureApp.create({
      getStartServices: core.getStartServices,
      application: core.application,
    });

    return {};
  }

  public start() {}

  public stop() {}
}
