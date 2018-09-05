/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from 'expect.js';
import { getUrlPrefix } from '../../lib/space_test_utils';
import { DEFAULT_SPACE_ID } from '../../../../../plugins/spaces/common/constants';

export function createTestSuiteFactory(es, esArchiver, supertest) {
  const spaceAwareType = 'visualization';
  const notSpaceAwareType = 'chapo';

  const makeCreateTest = describeFn => (description, {
    auth = {
      username: undefined,
      password: undefined
    },
    spaceId,
    tests,
  }) => {
    describeFn(description, () => {
      before(() => esArchiver.load('saved_objects/spaces'));
      after(() => esArchiver.unload('saved_objects/spaces'));
      it(`should return ${tests.spaceAware.statusCode} for a space-aware type`, async () => {
        await supertest
          .post(`${getUrlPrefix(spaceId)}/api/saved_objects/${spaceAwareType}`)
          .auth(auth.username, auth.password)
          .send({
            attributes: {
              title: 'My favorite vis'
            }
          })
          .expect(tests.spaceAware.statusCode)
          .then(tests.spaceAware.response);
      });

      it(`should return ${tests.notSpaceAware.statusCode} for a non space-aware type`, async () => {
        await supertest
          .post(`${getUrlPrefix(spaceId)}/api/saved_objects/${notSpaceAwareType}`)
          .auth(auth.username, auth.password)
          .send({
            attributes: {
              name: `Can't be contained to a space`,
            }
          })
          .expect(tests.notSpaceAware.statusCode)
          .then(tests.notSpaceAware.response);
      });

    });
  };

  const createTest = makeCreateTest(describe);
  createTest.only = makeCreateTest(describe.only);

  const createExpectSpaceAwareResults = (spaceId = DEFAULT_SPACE_ID) => async (resp) => {
    expect(resp.body).to.have.property('id').match(/^[0-9a-f-]{36}$/);

    // loose ISO8601 UTC time with milliseconds validation
    expect(resp.body).to.have.property('updated_at').match(/^[\d-]{10}T[\d:\.]{12}Z$/);

    expect(resp.body).to.eql({
      id: resp.body.id,
      type: spaceAwareType,
      updated_at: resp.body.updated_at,
      version: 1,
      attributes: {
        title: 'My favorite vis'
      }
    });

    const expectedSpacePrefix = spaceId === DEFAULT_SPACE_ID ? '' : `${spaceId}:`;

    // query ES directory to ensure namespace was or wasn't specified
    const { _source } = await es.get({
      id: `${expectedSpacePrefix}${spaceAwareType}:${resp.body.id}`,
      type: 'doc',
      index: '.kibana'
    });

    const {
      namespace: actualNamespace
    } = _source;

    if (spaceId === DEFAULT_SPACE_ID) {
      expect(actualNamespace).to.eql(undefined);
    } else {
      expect(actualNamespace).to.eql(spaceId);
    }
  };

  const expectNotSpaceAwareResults = () => async (resp) => {
    expect(resp.body).to.have.property('id').match(/^[0-9a-f-]{36}$/);

    // loose ISO8601 UTC time with milliseconds validation
    expect(resp.body).to.have.property('updated_at').match(/^[\d-]{10}T[\d:\.]{12}Z$/);

    expect(resp.body).to.eql({
      id: resp.body.id,
      type: notSpaceAwareType,
      updated_at: resp.body.updated_at,
      version: 1,
      attributes: {
        name: `Can't be contained to a space`,
      }
    });

    // query ES directory to ensure namespace wasn't specified
    const { _source } = await es.get({
      id: `${notSpaceAwareType}:${resp.body.id}`,
      type: 'doc',
      index: '.kibana'
    });

    const {
      namespace: actualNamespace
    } = _source;

    expect(actualNamespace).to.eql(undefined);
  };

  return {
    createTest,
    createExpectSpaceAwareResults,
    expectNotSpaceAwareResults,
    notSpaceAwareType,
    spaceAwareType,
  };
}
