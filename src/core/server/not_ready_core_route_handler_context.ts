/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// eslint-disable-next-line max-classes-per-file
import { InternalCoreSetup } from './internal_types';
import { InternalUiSettingsServiceSetup, IUiSettingsClient } from './ui_settings';

class NotReadyCoreUiSettingsRouteHandlerContext {
  #client?: IUiSettingsClient;
  constructor(private readonly uiSettingsSetup: InternalUiSettingsServiceSetup) {}

  public get client() {
    if (this.#client == null) {
      this.#client = this.uiSettingsSetup.defaultsClient();
    }
    return this.#client;
  }
}

export class NotReadyCoreRouteHandlerContext {
  readonly uiSettings: NotReadyCoreUiSettingsRouteHandlerContext;

  constructor(private readonly coreSetup: InternalCoreSetup) {
    this.uiSettings = new NotReadyCoreUiSettingsRouteHandlerContext(this.coreSetup.uiSettings);
  }
}
