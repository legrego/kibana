/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SpacesSavedObjectsClient } from './spaces_saved_objects_client';

export function spacesSavedObjectsClientWrapper(spacesService, types) {
  return ({ client, request }) => new SpacesSavedObjectsClient({
    baseClient: client,
    request,
    spacesService,
    types,
  });
}
