/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Plugin } from 'src/core/server';

import type { SpacesOssPluginSetup, SpacesOssPluginStart } from './types';

export class SpacesOssPlugin implements Plugin<SpacesOssPluginSetup, SpacesOssPluginStart, {}, {}> {
  private isSpacesAvailable: boolean = false;

  public setup() {
    return {
      setSpacesAvailable: (available: boolean) => {
        this.isSpacesAvailable = available;
      },
    };
  }

  public start() {
    return {
      isSpacesAvailable: this.isSpacesAvailable,
    };
  }
}
