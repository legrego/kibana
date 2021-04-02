/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import chalk from 'chalk';
import { RawConfigService, Env, CliArgs } from '@kbn/config';
import { first } from 'rxjs/operators';
import { KibanaSetupServer } from './kibana_setup_server';
import { RenderingService } from './rendering';

interface BootstrapArgs {
  configs: string[];
  cliArgs: CliArgs;
  applyConfigOverrides: (config: Record<string, any>) => Record<string, any>;
}

/**
 *
 * @internal
 * @param param0 - options
 */
export async function bootstrapSetup({ configs, cliArgs, applyConfigOverrides }: BootstrapArgs) {
  if (cliArgs.optimize) {
    // --optimize is deprecated and does nothing now, avoid starting up and just shutdown
    return;
  }

  // `bootstrap` is exported from the `src/core/server/index` module,
  // meaning that any test importing, implicitly or explicitly, anything concrete
  // from `core/server` will load `dev-utils`. As some tests are mocking the `fs` package,
  // and as `REPO_ROOT` is initialized on the fly when importing `dev-utils` and requires
  // the `fs` package, it causes failures. This is why we use a dynamic `require` here.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { REPO_ROOT } = require('@kbn/utils');

  const env = Env.createDefault(REPO_ROOT, {
    configs,
    cliArgs,
  });

  const rawConfigService = new RawConfigService(env.configs, applyConfigOverrides);
  rawConfigService.loadConfig();

  const initialConfig = await rawConfigService.getConfig$().pipe(first()).toPromise();

  // TODO: probably need a better check
  const explicitlyRequestedSetupMode = cliArgs.setup;
  const isESConfigured = Object.keys(initialConfig.elasticsearch ?? {}).length > 0;

  if (isESConfigured && !explicitlyRequestedSetupMode) {
    console.log('Setup already completed. Skipping setup mode.');
    return;
  }

  const setupServer = new KibanaSetupServer();

  process.on('SIGHUP', () => reloadLoggingConfig());

  function reloadLoggingConfig() {
    // const cliLogger = root.logger.get('cli');
    // cliLogger.info('Reloading logging configuration due to SIGHUP.', { tags: ['config'] });
    console.log('Reloading logging configuration due to SIGHUP.', { tags: ['config'] });

    try {
      rawConfig.reloadConfig();
    } catch (err) {
      return shutdown(err);
    }

    console.log('Reloaded logging configuration due to SIGHUP.', { tags: ['config'] });
  }

  process.on('SIGINT', () => shutdown());
  process.on('SIGTERM', () => shutdown());

  function shutdown(reason?: Error) {
    if (reason) {
      console.error('SHUTTING DOWN DUE TO ERROR', reason);
    }
    rawConfigService.stop();
    setupServer.stop();
  }

  try {
    const renderingService = new RenderingService();
    const rendering = await renderingService.setup({ env });
    await setupServer.setup({ rendering, env });
    await setupServer.start();
  } catch (err) {
    await shutdown(err);
  }
}

function onRootShutdown(reason?: any) {
  if (reason !== undefined) {
    // There is a chance that logger wasn't configured properly and error that
    // that forced root to shut down could go unnoticed. To prevent this we always
    // mirror such fatal errors in standard output with `console.error`.
    // eslint-disable-next-line
    console.error(`\n${chalk.white.bgRed(' FATAL ')} ${reason}\n`);

    process.exit(reason instanceof CriticalError ? reason.processExitCode : 1);
  }

  process.exit(0);
}
