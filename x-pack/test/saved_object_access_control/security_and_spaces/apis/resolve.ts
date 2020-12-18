/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { SavedObjectsResolveResponse, SavedObjectAccessControl } from 'kibana/server';
import {
  CONFIDENTIAL_SAVED_OBJECT_TYPE,
  CONFIDENTIAL_MULTI_NAMESPACE_SAVED_OBJECT_TYPE,
} from '../../fixtures/confidential_plugin/server';
import { USERS, ExpectedResponse, assertSavedObjectExists } from '../../common/lib';
import { FtrProviderContext } from '../../services';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const es = getService('es');

  describe('GET /api/saved_objects/resolve/{type}/{id}', () => {
    before(async () => {
      await esArchiver.load(
        'x-pack/test/saved_object_access_control/fixtures/es_archiver/confidential_objects'
      );
    });

    after(async () => {
      await esArchiver.unload(
        'x-pack/test/saved_object_access_control/fixtures/es_archiver/confidential_objects'
      );
    });

    const authorizedExpectedResponse: ExpectedResponse<
      [
        {
          savedObject: { type: string; id: string; accessControl: SavedObjectAccessControl };
          outcome: SavedObjectsResolveResponse['outcome'];
        }
      ]
    > = {
      httpCode: 200,
      expectResponse: ({ savedObject, outcome }) => ({ body }) => {
        expect(body.outcome).to.eql(outcome);
        const { type, id, accessControl } = body.saved_object;
        expect({ type, id, accessControl }).to.eql({
          type: savedObject.type,
          id: savedObject.id,
          accessControl: savedObject.accessControl,
        });
      },
    };

    const notFoundExpectedResponse: ExpectedResponse<[{ savedObjectId: string }]> = {
      httpCode: 404,
      expectResponse: ({ savedObjectId }) => ({ body }) => {
        expect(body).to.eql({
          statusCode: 404,
          error: 'Not Found',
          message: `Saved object [${CONFIDENTIAL_SAVED_OBJECT_TYPE}/${savedObjectId}] not found`,
        });
      },
    };

    const unauthorizedExpectedResponse: ExpectedResponse<[{ type: string; id?: string }]> = {
      httpCode: 403,
      expectResponse: ({ type, id }) => ({ body }) => {
        expect(body).to.eql({
          statusCode: 403,
          error: 'Forbidden',
          message: `Unable to get ${type}${id ? `:${id}` : ''}`,
        });
      },
    };

    it('returns 404 for confidential objects that do not exist', async () => {
      const { username, password } = USERS.ALICE;
      const { httpCode, expectResponse } = notFoundExpectedResponse;
      const savedObjectId = 'not_found_object';
      await supertest
        .get(`/api/saved_objects/resolve/${CONFIDENTIAL_SAVED_OBJECT_TYPE}/${savedObjectId}`)
        .auth(username, password)
        .expect(httpCode)
        .then(expectResponse({ savedObjectId }));
    });

    it('returns 403 for confidential objects that belong to another user', async () => {
      const { username, password } = USERS.ALICE;
      const { httpCode, expectResponse } = unauthorizedExpectedResponse;
      const savedObjectId = 'bob_doc_1';

      await assertSavedObjectExists(es, CONFIDENTIAL_SAVED_OBJECT_TYPE, savedObjectId);

      await supertest
        .get(`/api/saved_objects/resolve/${CONFIDENTIAL_SAVED_OBJECT_TYPE}/${savedObjectId}`)
        .auth(username, password)
        .expect(httpCode)
        .then(expectResponse({ type: CONFIDENTIAL_SAVED_OBJECT_TYPE, id: savedObjectId }));
    });

    it('returns 404 for confidential objects that exist in another space', async () => {
      const { username, password } = USERS.ALICE;
      const { httpCode, expectResponse } = notFoundExpectedResponse;
      const savedObjectId = 'alice_space_1_doc';

      await assertSavedObjectExists(es, CONFIDENTIAL_SAVED_OBJECT_TYPE, savedObjectId, 'space_1');

      await supertest
        .get(`/api/saved_objects/resolve/${CONFIDENTIAL_SAVED_OBJECT_TYPE}/${savedObjectId}`)
        .auth(username, password)
        .expect(httpCode)
        .then(expectResponse({ savedObjectId }));
    });

    it('returns 403 for users who cannot access confidential objects of this type', async () => {
      const { username, password } = USERS.CHARLIE;
      const { httpCode, expectResponse } = unauthorizedExpectedResponse;
      const savedObjectId = 'charlie_doc_1';

      await assertSavedObjectExists(es, CONFIDENTIAL_SAVED_OBJECT_TYPE, savedObjectId);

      await supertest
        .get(`/api/saved_objects/resolve/${CONFIDENTIAL_SAVED_OBJECT_TYPE}/${savedObjectId}`)
        .auth(username, password)
        .expect(httpCode)
        .then(expectResponse({ type: CONFIDENTIAL_SAVED_OBJECT_TYPE }));
    });

    it('returns 200 for confidential objects that belong to the current user (exact match)', async () => {
      const { username, password } = USERS.ALICE;
      const { httpCode, expectResponse } = authorizedExpectedResponse;
      const savedObjectId = 'alice_doc_1';
      await supertest
        .get(`/api/saved_objects/resolve/${CONFIDENTIAL_SAVED_OBJECT_TYPE}/${savedObjectId}`)
        .auth(username, password)
        .expect(httpCode)
        .then(
          expectResponse({
            savedObject: {
              type: CONFIDENTIAL_SAVED_OBJECT_TYPE,
              id: savedObjectId,
              accessControl: { owner: username },
            },
            outcome: 'exactMatch',
          })
        );
    });

    it('returns 200 for confidential objects that belong to the current user (alias match)', async () => {
      const { username, password } = USERS.ALICE;
      const { httpCode, expectResponse } = authorizedExpectedResponse;
      const savedObjectId = 'alice_alias-match';
      await supertest
        .get(
          `/s/space_1/api/saved_objects/resolve/${CONFIDENTIAL_MULTI_NAMESPACE_SAVED_OBJECT_TYPE}/${savedObjectId}`
        )
        .auth(username, password)
        .expect(httpCode)
        .then(
          expectResponse({
            savedObject: {
              type: CONFIDENTIAL_MULTI_NAMESPACE_SAVED_OBJECT_TYPE,
              id: 'alice_alias-match-newid',
              accessControl: { owner: username },
            },
            outcome: 'aliasMatch',
          })
        );
    });

    it('allows superusers to access objects from other users (exact match)', async () => {
      const { username, password } = USERS.SUPERUSER;
      const { httpCode, expectResponse } = authorizedExpectedResponse;
      const savedObjectId = 'alice_doc_1';

      await assertSavedObjectExists(es, CONFIDENTIAL_SAVED_OBJECT_TYPE, savedObjectId);

      await supertest
        .get(`/api/saved_objects/resolve/${CONFIDENTIAL_SAVED_OBJECT_TYPE}/${savedObjectId}`)
        .auth(username, password)
        .expect(httpCode)
        .then(
          expectResponse({
            savedObject: {
              type: CONFIDENTIAL_SAVED_OBJECT_TYPE,
              id: savedObjectId,
              accessControl: { owner: USERS.ALICE.username },
            },
            outcome: 'exactMatch',
          })
        );
    });

    it('allows superusers to access objects from other users (alias match)', async () => {
      const { username, password } = USERS.SUPERUSER;
      const { httpCode, expectResponse } = authorizedExpectedResponse;
      const savedObjectId = 'alice_alias-match';

      await supertest
        .get(
          `/s/space_1/api/saved_objects/resolve/${CONFIDENTIAL_MULTI_NAMESPACE_SAVED_OBJECT_TYPE}/${savedObjectId}`
        )
        .auth(username, password)
        .expect(httpCode)
        .then(
          expectResponse({
            savedObject: {
              type: CONFIDENTIAL_MULTI_NAMESPACE_SAVED_OBJECT_TYPE,
              id: 'alice_alias-match-newid',
              accessControl: { owner: USERS.ALICE.username },
            },
            outcome: 'aliasMatch',
          })
        );
    });
  });
}
