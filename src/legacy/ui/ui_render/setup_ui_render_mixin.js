/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import Boom from '@hapi/boom';
import * as UiSharedDeps from '@kbn/ui-shared-deps';
import { AppBootstrap } from './bootstrap';

export function setupUiRenderMixin(server, env) {
  server.route({
    path: '/bootstrap.js',
    method: 'GET',
    async handler(request, h) {
      const darkMode = false;

      const themeVersion = 'v7';

      const themeTag = `${themeVersion === 'v7' ? 'v7' : 'v8'}${darkMode ? 'dark' : 'light'}`;

      const buildHash = env.packageInfo.buildNum;
      const basePath = '';

      const regularBundlePath = `${basePath}/${buildHash}/bundles`;

      const styleSheetPaths = [
        `${regularBundlePath}/kbn-ui-shared-deps/${UiSharedDeps.baseCssDistFilename}`,
        ...(darkMode
          ? [
              themeVersion === 'v7'
                ? `${regularBundlePath}/kbn-ui-shared-deps/${UiSharedDeps.darkCssDistFilename}`
                : `${regularBundlePath}/kbn-ui-shared-deps/${UiSharedDeps.darkV8CssDistFilename}`,
            ]
          : [
              themeVersion === 'v7'
                ? `${regularBundlePath}/kbn-ui-shared-deps/${UiSharedDeps.lightCssDistFilename}`
                : `${regularBundlePath}/kbn-ui-shared-deps/${UiSharedDeps.lightV8CssDistFilename}`,
            ]),
      ];

      const jsDependencyPaths = [
        ...UiSharedDeps.jsDepFilenames.map(
          (filename) => `${regularBundlePath}/kbn-ui-shared-deps/${filename}`
        ),
        `${regularBundlePath}/kbn-ui-shared-deps/${UiSharedDeps.jsFilename}`,

        `${regularBundlePath}/setup/setup.entry.js`,
      ];

      // These paths should align with the bundle routes configured in
      // src/optimize/bundles_route/bundles_route.ts
      // const publicPathMap = JSON.stringify({
      //   core: `${regularBundlePath}/core/`,
      //   'kbn-ui-shared-deps': `${regularBundlePath}/kbn-ui-shared-deps/`,
      // });
      const publicPathMap = JSON.stringify({
        setup: `${regularBundlePath}/setup/`,
        'kbn-ui-shared-deps': `${regularBundlePath}/kbn-ui-shared-deps/`,
      });

      const bootstrap = new AppBootstrap({
        templateData: {
          entry: 'entry/setup/public',
          themeTag,
          jsDependencyPaths,
          styleSheetPaths,
          publicPathMap,
        },
      });

      const body = await bootstrap.getJsFile();
      const etag = await bootstrap.getJsFileHash();

      return h
        .response(body)
        .header('cache-control', 'must-revalidate')
        .header('content-type', 'application/javascript')
        .etag(etag);
    },
  });

  server.route({
    path: '/app/{id}/{any*}',
    method: 'GET',
    async handler(req, h) {
      try {
        return await h.renderApp();
      } catch (err) {
        throw Boom.boomify(err);
      }
    },
  });

  async function renderApp(h) {
    const content = 'hmmmm';

    return h
      .response(content)
      .type('text/html'); /*.header('content-security-policy', http.csp.header);*/
  }

  server.decorate('toolkit', 'renderApp', function () {
    return renderApp(this);
  });
}
