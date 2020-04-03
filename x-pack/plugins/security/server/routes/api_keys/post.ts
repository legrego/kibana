/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { wrapIntoCustomErrorResponse } from '../../errors';
import { createLicensedRouteHandler } from '../licensed_route_handler';
import { RouteDefinitionParams } from '..';

export function definePostApiKeysRoutes({ router, authc }: RouteDefinitionParams) {
  router.post(
    {
      path: '/internal/security/api_key/create/{apiKeyName}',
      validate: {
        params: schema.object({ apiKeyName: schema.string() }),
      },
    },
    createLicensedRouteHandler(async (context, request, response) => {
      try {
        const createdKey = await authc.createAPIKey(request, {
          name: request.params.apiKeyName,
          role_descriptors: {},
        });

        if (!createdKey) {
          return response.customError(
            wrapIntoCustomErrorResponse(`Unknown error creating API Key`)
          );
        }

        return response.ok({ body: createdKey });
      } catch (error) {
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    })
  );
}
