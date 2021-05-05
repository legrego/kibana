/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * OSS Spaces plugin setup contract.
 */
export interface SpacesOssPluginSetup {
  /**
   * Allows consumers to indicate that the Spaces feature is available.
   * @private only intended for consumption by the Spaces plugin.
   *
   * @deprecated The Spaces feature cannot be disabled starting in 8.0.
   * @removeBy 7.15
   *
   * @param available flag indicating if the Spaces features is available.
   */
  setSpacesAvailable(available: boolean): void;
}

/**
 * OSS Spaces plugin start contract.
 */
export interface SpacesOssPluginStart {
  /**
   * Indicates if the Spaces feature is available.
   *
   * @deprecated The Spaces feature cannot be disabled starting in 8.0.
   * @removeBy 7.15
   */
  isSpacesAvailable: boolean;
}
