/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createReadStream } from 'fs';
import Path, { resolve, extname } from 'path';
import mime from 'mime-types';
import Hapi, { Server } from '@hapi/hapi';
import HapiStaticFiles from '@hapi/inert';
import { distDir as uiSharedDepsDistDir } from '@kbn/ui-shared-deps';

import { Env } from '@kbn/config';
import { fstat, close } from '../../core/server/core_app/bundle_routes/fs';
import { getFileHash } from '../../core/server/core_app/bundle_routes/file_hash';
import { FileHashCache } from '../../core/server/core_app/bundle_routes/file_hash_cache';
import { bootstrapRendererFactory, InternalRenderingServiceSetup } from './rendering';
import { selectCompressedFile } from '../../core/server/core_app/bundle_routes/select_compressed_file';
interface SetupDeps {
  rendering: InternalRenderingServiceSetup;
  env: Env;
}

export class KibanaSetupServer {
  private server: Server;

  constructor() {
    this.server = Hapi.server({
      port: 5602,
      host: 'localhost',
    });
  }

  public async setup({ rendering, env }: SetupDeps) {
    const plugins = [HapiStaticFiles];

    await this.server.register(plugins);

    // FIXME: don't reach into core like this
    this.registerStaticDir(
      '/ui/{path*}',
      Path.resolve(__dirname, '..', '..', 'core', 'server', 'core_app', 'assets')
    );
    this.registerStaticDir(
      '/node_modules/@kbn/ui-framework/dist/{path*}',
      Path.resolve(__dirname, '..', '..', '..', 'node_modules', '@kbn', 'ui-framework', 'dist')
    );

    this.server.route({
      path: '/',
      method: 'GET',
      handler: (request) => {
        return rendering.render(request, {});
      },
    });

    this.server.route({
      path: '/bootstrap.js',
      method: 'GET',
      handler: async (req, res) => {
        const renderer = bootstrapRendererFactory({
          packageInfo: env.packageInfo,
          serverBasePath: '',
        });

        const { body, etag } = await renderer({ request: req });

        const response = res.response(body);
        response.etag(etag);
        response.header('content-type', 'application/json');
        response.header('cache-control', 'must-revalidate');

        return response;
      },
    });

    const serverBasePath = '';
    const buildNum = env.packageInfo.buildNum.toString();
    const isDist = false;
    const fileHashCache = new FileHashCache();
    const publicPath = `${this.server}/${buildNum}/bundles/kbn-ui-shared-deps/`;
    this.server.route({
      path: `/${buildNum}/bundles/kbn-ui-shared-deps/{path*}`,
      method: 'GET',
      handler: async (req, res) => {
        let fd: number | undefined;
        let fileEncoding: 'gzip' | 'br' | undefined;

        try {
          const path = resolve(uiSharedDepsDistDir, req.params.path);

          // prevent path traversal, only process paths that resolve within bundlesPath
          if (!path.startsWith(uiSharedDepsDistDir)) {
            const response = res.response('EACCES');
            response.code(403);
            return response;
          }

          // we use and manage a file descriptor mostly because
          // that's what Inert does, and since we are accessing
          // the file 2 or 3 times per request it seems logical
          ({ fd, fileEncoding } = await selectCompressedFile(
            req.headers['accept-encoding'] as string,
            path
          ));

          let headers: Record<string, string>;
          const DAY = 1000 * 60 * 60 * 24;
          if (isDist) {
            headers = { 'cache-control': `max-age=${365 * DAY}` };
          } else {
            const stat = await fstat(fd);
            const hash = await getFileHash(fileHashCache, path, stat, fd);
            headers = {
              etag: `${hash}-${publicPath}`,
              'cache-control': 'must-revalidate',
            };
          }

          // If we manually selected a compressed file, specify the encoding header.
          // Otherwise, let Hapi automatically gzip the response.
          if (fileEncoding) {
            headers['content-encoding'] = fileEncoding;
          }

          const fileExt = extname(path);
          const contentType = mime.lookup(fileExt);
          const mediaType = mime.contentType(contentType || fileExt);
          headers['content-type'] = mediaType || '';

          const content = createReadStream(null as any, {
            fd,
            start: 0,
            autoClose: true,
          });

          const response = res.response(content);
          Object.entries(headers).forEach((header) => response.header(header[0], header[1]));

          return response;
        } catch (error) {
          if (fd) {
            try {
              await close(fd);
            } catch (_) {
              // ignore errors from close, we already have one to report
              // and it's very likely they are the same
            }
          }
          if (error.code === 'ENOENT') {
            return res.response().code(404);
          }
          throw error;
        }
      },
    });

    this.server.route({
      path: `/${buildNum}/bundles/setup/{path*}`,
      method: 'GET',
      handler: async (req, res) => {
        let fd: number | undefined;
        let fileEncoding: 'gzip' | 'br' | undefined;

        try {
          const bundlesPath = Path.join(__dirname, '..', '..', 'setup', 'target', 'public');

          const path = resolve(bundlesPath, req.params.path);

          // prevent path traversal, only process paths that resolve within bundlesPath
          if (!path.startsWith(bundlesPath)) {
            const response = res.response('EACCES');
            response.code(403);
            return response;
          }

          // we use and manage a file descriptor mostly because
          // that's what Inert does, and since we are accessing
          // the file 2 or 3 times per request it seems logical
          ({ fd, fileEncoding } = await selectCompressedFile(
            req.headers['accept-encoding'] as string,
            path
          ));

          let headers: Record<string, string>;
          const DAY = 1000 * 60 * 60 * 24;
          if (isDist) {
            headers = { 'cache-control': `max-age=${365 * DAY}` };
          } else {
            const stat = await fstat(fd);
            const hash = await getFileHash(fileHashCache, path, stat, fd);
            headers = {
              etag: `${hash}-${publicPath}`,
              'cache-control': 'must-revalidate',
            };
          }

          // If we manually selected a compressed file, specify the encoding header.
          // Otherwise, let Hapi automatically gzip the response.
          if (fileEncoding) {
            headers['content-encoding'] = fileEncoding;
          }

          const fileExt = extname(path);
          const contentType = mime.lookup(fileExt);
          const mediaType = mime.contentType(contentType || fileExt);
          headers['content-type'] = mediaType || '';

          const content = createReadStream(null as any, {
            fd,
            start: 0,
            autoClose: true,
          });

          const response = res.response(content);
          Object.entries(headers).forEach((header) => response.header(header[0], header[1]));

          return response;
        } catch (error) {
          if (fd) {
            try {
              await close(fd);
            } catch (_) {
              // ignore errors from close, we already have one to report
              // and it's very likely they are the same
            }
          }
          if (error.code === 'ENOENT') {
            return res.response().code(404);
          }
          throw error;
        }
      },
    });
  }

  public async start() {
    console.log('starting server...');
    await this.server.start();
    console.log('Server running on %s', this.server.info.uri);
  }

  public async stop() {
    console.log('shutting down setup server...');
    await this.server.stop();
  }

  private registerStaticDir(path: string, dirPath: string) {
    if (this.server === undefined) {
      throw new Error('Http server is not setup up yet');
    }
    // if (this.stopped) {
    //   this.log.warn(`registerStaticDir called after stop`);
    // }

    this.server.route({
      path,
      method: 'GET',
      handler: {
        directory: {
          path: dirPath,
          listing: false,
          lookupCompressed: true,
        },
      },
      options: { auth: false },
    });
  }
}
