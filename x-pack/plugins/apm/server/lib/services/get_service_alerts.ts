/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SERVICE_NAME,
  TRANSACTION_TYPE,
} from '../../../common/elasticsearch_fieldnames';
import type { PromiseReturnType } from '../../../../observability/typings/common';
import type { APMRuleRegistry } from '../../plugin';
import { environmentQuery, rangeQuery } from '../../utils/queries';

export async function getServiceAlerts({
  apmRuleRegistryClient,
  start,
  end,
  serviceName,
  environment,
  transactionType,
}: {
  apmRuleRegistryClient: Exclude<
    PromiseReturnType<APMRuleRegistry['createScopedRuleRegistryClient']>,
    undefined
  >;
  start: number;
  end: number;
  serviceName: string;
  environment?: string;
  transactionType: string;
}) {
  const response = await apmRuleRegistryClient.search({
    body: {
      query: {
        bool: {
          filter: [
            ...rangeQuery(start, end),
            ...environmentQuery(environment),
            { term: { [SERVICE_NAME]: serviceName } },
          ],
          should: [
            {
              bool: {
                filter: [
                  {
                    term: {
                      [TRANSACTION_TYPE]: transactionType,
                    },
                  },
                ],
              },
            },
            {
              bool: {
                must_not: {
                  exists: {
                    field: TRANSACTION_TYPE,
                  },
                },
              },
            },
          ],
          minimum_should_match: 1,
        },
      },
      size: 100,
      fields: ['*'],
      collapse: {
        field: 'kibana.rac.alert.uuid',
      },
      sort: {
        '@timestamp': 'desc',
      },
    },
  });

  return response.events;
}
