/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CoreSetup, CoreStart, Plugin } from 'src/core/public';
import React from 'react';
import ReactDOM from 'react-dom';
import { App } from './app';

export class SetupPlugin implements Plugin<void, void, {}, {}> {
  constructor() {}

  public setup(core: CoreSetup) {
    core.application.register({
      id: 'setup',
      title: 'Setup',
      chromeless: true,
      mount: (params) => {
        ReactDOM.render(<App />, params.element);
        return () => ReactDOM.unmountComponentAtNode(params.element);
      },
    });
  }

  public start(core: CoreStart) {}
}
