/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Request } from '@hapi/hapi';
import { createHash } from 'crypto';
import { PackageInfo } from '@kbn/config';
import { getJsDependencyPaths } from './get_js_dependency_paths';
import { getThemeTag } from './get_theme_tag';
import { renderTemplate } from './render_template';

export type BootstrapRendererFactory = (factoryOptions: FactoryOptions) => BootstrapRenderer;
export type BootstrapRenderer = (options: RenderedOptions) => Promise<RendererResult>;

interface FactoryOptions {
  serverBasePath: string;
  packageInfo: PackageInfo;
}

interface RenderedOptions {
  request: Request;
}

interface RendererResult {
  body: string;
  etag: string;
}

export const bootstrapRendererFactory: BootstrapRendererFactory = ({
  packageInfo,
  serverBasePath,
}) => {
  return async function bootstrapRenderer({ request }) {
    const darkMode = false;
    const themeVersion = 'v8';

    const themeTag = getThemeTag({
      themeVersion,
      darkMode,
    });
    const buildHash = packageInfo.buildNum;
    const regularBundlePath = `${serverBasePath}/${buildHash}/bundles`;

    const jsDependencyPaths = getJsDependencyPaths(regularBundlePath);

    // These paths should align with the bundle routes configured in
    // src/optimize/bundles_route/bundles_route.ts
    const publicPathMap = JSON.stringify({
      // core: `${regularBundlePath}/core/`,
      setup: `${regularBundlePath}/setup/`,
      'kbn-ui-shared-deps': `${regularBundlePath}/kbn-ui-shared-deps/`,
    });

    const body = renderTemplate({
      themeTag,
      jsDependencyPaths,
      publicPathMap,
    });

    const hash = createHash('sha1');
    hash.update(body);
    const etag = hash.digest('hex');

    return {
      body,
      etag,
    };
  };
};
