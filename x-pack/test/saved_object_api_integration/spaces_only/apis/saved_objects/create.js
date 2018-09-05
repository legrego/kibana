/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SPACES } from '../../../common/lib/spaces';
import { createTestSuiteFactory } from '../../../common/suites/saved_objects/create';

export default function ({ getService }) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');
  const esArchiver = getService('esArchiver');

  const {
    createTest,
    createExpectSpaceAwareResults,
    expectNotSpaceAwareResults
  } = createTestSuiteFactory(es, esArchiver, supertestWithoutAuth);

  describe('create', () => {

    createTest('in the current space (space_1)', {
      ...SPACES.SPACE_1,
      tests: {
        spaceAware: {
          statusCode: 200,
          response: createExpectSpaceAwareResults(SPACES.SPACE_1.spaceId),
        },
        notSpaceAware: {
          statusCode: 200,
          response: expectNotSpaceAwareResults(SPACES.SPACE_1.spaceId),
        }
      }
    });

    createTest('in the default space', {
      ...SPACES.DEFAULT,
      tests: {
        spaceAware: {
          statusCode: 200,
          response: createExpectSpaceAwareResults(SPACES.DEFAULT.spaceId),
        },
        notSpaceAware: {
          statusCode: 200,
          response: expectNotSpaceAwareResults(SPACES.SPACE_1.spaceId),
        }
      }
    });
  });
}
