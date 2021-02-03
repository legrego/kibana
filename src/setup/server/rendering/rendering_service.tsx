/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Env } from '@kbn/config';
import { i18n } from '@kbn/i18n';

import { Template } from './views';
import { InternalRenderingServiceSetup, RenderingMetadata } from './types';
import { getStylesheetPaths } from '../../../core/server/rendering/render_utils';

/** @internal */

interface SetupDeps {
  env: Env;
}
export class RenderingService {
  constructor() {}

  public async setup({ env }: SetupDeps): Promise<InternalRenderingServiceSetup> {
    return {
      render: async (request, options = {}) => {
        const basePath = '';
        const serverBasePath = '';
        const publicBaseUrl = '';
        const buildHash = env.packageInfo.buildNum.toString();

        const stylesheetPaths = getStylesheetPaths({
          basePath,
          buildNum: env.packageInfo.buildNum,
          darkMode: false,
          themeVersion: 'v8',
        });

        const metadata: RenderingMetadata = {
          strictCsp: false, // FIXME
          uiPublicUrl: `${basePath}/ui`,
          bootstrapScriptUrl: `${basePath}/bootstrap.js`,
          i18n: i18n.translate,
          locale: i18n.getLocale(),
          darkMode: false,
          stylesheetPaths,
          injectedMetadata: {
            version: env.packageInfo.version,
            buildNumber: env.packageInfo.buildNum,
            branch: env.packageInfo.branch,
            basePath,
            serverBasePath,
            publicBaseUrl,
            i18n: {
              translationsUrl: `${basePath}/translations/${i18n.getLocale()}.json`,
            },
          },
        };

        return `<!DOCTYPE html>${renderToStaticMarkup(<Template metadata={metadata} />)}`;
      },
    };
  }

  public async stop() {}
}
