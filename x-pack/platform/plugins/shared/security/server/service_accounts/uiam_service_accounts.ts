/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type {
  CreateServiceAccountParams,
  ServiceAccount,
  UiamOAuthProjectType,
} from '@kbn/core-security-server';
import { z } from '@kbn/zod';

import { buildAssumableBy } from './assumable_by';
import type { ServiceAccountsBackend } from './types';
import type { SecurityLicense } from '../../common';
import { getDetailedErrorMessage } from '../errors';
import { getUiamAccessTokenFromRequest, type UiamServicePublic } from '../uiam';

/**
 * The upstream endpoint has not been implemented yet, so the response shape we
 * code against is derived from the API specification rather than observed
 * behaviour. Validating it here means the first real call fails loudly instead of
 * leaking partially-undefined objects to consumers.
 *
 * TODO(https://github.com/elastic/kibana/issues/284463): revisit once UIAM ships
 * the endpoint and the response shape is confirmed.
 */
// Loose objects, so that fields the upstream service adds are passed through rather than stripped.
const serviceAccountSchema = z.looseObject({
  // codeql[js/kibana/unbounded-string-in-schema] upstream response — not caller-controlled input
  id: z.string(),
  name: z.string(),
  organization_id: z.string(),
  role_assignments: z.record(z.string(), z.unknown()),
  assumable_by: z.array(
    z.looseObject({
      type: z.literal('kibana'),
      organization_id: z.string(),
      project_type: z.string(),
      project_id: z.string(),
    })
  ),
});

export interface UiamServiceAccountsOptions {
  logger: Logger;
  license: SecurityLicense;
  uiam: UiamServicePublic;
  organizationId: string;
  projectId: string;
  projectType: UiamOAuthProjectType;
}

export class UiamServiceAccounts implements ServiceAccountsBackend {
  private readonly logger: Logger;
  private readonly license: SecurityLicense;
  private readonly uiam: UiamServicePublic;
  private readonly organizationId: string;
  private readonly projectId: string;
  private readonly projectType: UiamOAuthProjectType;

  constructor({
    logger,
    license,
    uiam,
    organizationId,
    projectId,
    projectType,
  }: UiamServiceAccountsOptions) {
    this.logger = logger;
    this.license = license;
    this.uiam = uiam;
    this.organizationId = organizationId;
    this.projectId = projectId;
    this.projectType = projectType;
  }

  async create(
    request: KibanaRequest,
    params: CreateServiceAccountParams
  ): Promise<ServiceAccount> {
    if (!this.license.isEnabled()) {
      throw Boom.forbidden(
        'Cannot create a service account: security features are disabled in Elasticsearch'
      );
    }

    const accessToken = getUiamAccessTokenFromRequest(request);
    this.logger.debug('Attempting to create a service account');

    try {
      const result = await this.uiam.createServiceAccount(accessToken, {
        name: params.name,
        role_assignments: params.role_assignments,
        assumable_by: buildAssumableBy({
          organizationId: this.organizationId,
          projectId: this.projectId,
          projectType: this.projectType,
        }),
      });

      const validated = serviceAccountSchema.parse(result);
      this.logger.debug(`Service account created successfully with id ${validated.id}`);

      return validated;
    } catch (e) {
      this.logger.error(`Failed to create service account: ${getDetailedErrorMessage(e)}`);
      throw e;
    }
  }
}
