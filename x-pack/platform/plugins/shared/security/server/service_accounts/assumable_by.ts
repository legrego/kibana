/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceAccountAssumableBy, UiamOAuthProjectType } from '@kbn/core-security-server';

export interface BuildAssumableByParams {
  organizationId: string;
  projectId: string;
  projectType: UiamOAuthProjectType;
}

/**
 * Builds the set of principals allowed to exchange a service account's credentials
 * for an access token, scoping it to the current Kibana project.
 *
 * This is the only place the payload is constructed, because the upstream
 * documentation disagrees with itself about its shape: the technical design
 * document specifies `type: 'project-service-account'` while the API
 * specification's create example uses `type: 'kibana'`. We follow the API
 * specification.
 *
 * TODO(https://github.com/elastic/kibana/issues/284463): reconcile with the UIAM
 * team before service accounts are enabled in any environment.
 */
export const buildAssumableBy = ({
  organizationId,
  projectId,
  projectType,
}: BuildAssumableByParams): ServiceAccountAssumableBy[] => [
  {
    type: 'kibana',
    organization_id: organizationId,
    project_type: projectType,
    project_id: projectId,
  },
];
