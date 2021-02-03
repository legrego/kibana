/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import Hapi from '@hapi/hapi';

/** @internal */
export interface RenderingMetadata {
  strictCsp: boolean;
  uiPublicUrl: string;
  bootstrapScriptUrl: string;
  i18n: typeof i18n.translate;
  locale: string;
  darkMode: boolean;
  stylesheetPaths: string[];
  injectedMetadata: {
    version: string;
    buildNumber: number;
    branch: string;
    basePath: string;
    serverBasePath: string;
    publicBaseUrl?: string;
    i18n: {
      translationsUrl: string;
    };
  };
}

/** @internal */
export interface InternalRenderingServiceSetup {
  /**
   * Generate a response which renders an HTML page bootstrapped
   * with the `setup` bundle.
   *
   * @example
   * ```ts
   * const html = await rendering.render(request, uiSettings);
   * ```
   */
  render(request: Hapi.Request, options?: Record<string, any>): Promise<string>;
}
