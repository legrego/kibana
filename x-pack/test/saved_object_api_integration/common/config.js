/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import path from 'path';
import { resolveKibanaPath } from '@kbn/plugin-helpers';
import { EsProvider } from './services/es';


export function createTestConfig(name, { license = 'trial', disabledPlugins = [], securityEnabled = true } = {}) {

  return async function ({ readConfigFile }) {

    const config = {
      kibana: {
        api: await readConfigFile(resolveKibanaPath('test/api_integration/config.js')),
        functional: await readConfigFile(require.resolve('../../../../test/functional/config.js'))
      },
      xpack: {
        api: await readConfigFile(require.resolve('../../api_integration/config.js'))
      }
    };

    return {
      testFiles: [require.resolve(`../${name}/apis/`)],
      servers: config.xpack.api.get('servers'),
      services: {
        es: EsProvider,
        // Provide license and list of disabled plugins to tests so they can alter their configuration
        testEnv: () => ({
          license,
          disabledPlugins,
        }),
        esSupertestWithoutAuth: config.xpack.api.get('services.esSupertestWithoutAuth'),
        supertest: config.kibana.api.get('services.supertest'),
        supertestWithoutAuth: config.xpack.api.get('services.supertestWithoutAuth'),
        esArchiver: config.kibana.functional.get('services.esArchiver'),
        kibanaServer: config.kibana.functional.get('services.kibanaServer'),
      },
      junit: {
        reportName: 'X-Pack Saved Object API Integration Tests -- ' + name,
      },

      esArchiver: {
        directory: path.join(__dirname, 'fixtures', 'es_archiver')
      },

      esTestCluster: {
        license,
        from: 'snapshot',
        securityEnabled,
        serverArgs: [
          ...license === 'trial' ? ['xpack.license.self_generated.type=trial'] : [],
        ],
      },

      kbnTestServer: {
        ...config.xpack.api.get('kbnTestServer'),
        serverArgs: [
          ...config.xpack.api.get('kbnTestServer.serverArgs'),
          '--optimize.enabled=false',
          '--server.xsrf.disableProtection=true',
          ...disabledPlugins.map(key => `--xpack.${key}.enabled=false`)
        ],
      },
    };
  };
}
