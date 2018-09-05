/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { createUsersAndRoles } from "../../common/lib/create_users_and_roles";

export default function ({ loadTestFile, getService }) {
  const es = getService('es');
  const supertest = getService('supertest');

  describe('security and spaces enabled', () => {
    before(async () => {
      await createUsersAndRoles(es, supertest);
    });

    loadTestFile(require.resolve('./saved_objects'));
  });
}
