/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { AUTHENTICATION } from '../../../common/lib/authentication';
import { createTestSuiteFactory } from '../../../common/suites/saved_objects/create';
import { SPACES } from '../../../common/lib/spaces';

export default function ({ getService }) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');
  const esArchiver = getService('esArchiver');

  const {
    createTest,
    createExpectSpaceAwareResults,
    expectNotSpaceAwareResults,
    notSpaceAwareType,
    spaceAwareType,
  } = createTestSuiteFactory(es, esArchiver, supertestWithoutAuth);

  describe('create', () => {

    const createExpectRbacForbidden = type => resp => {
      expect(resp.body).to.eql({
        statusCode: 403,
        error: 'Forbidden',
        message: `Unable to create ${type}, missing action:saved_objects/${type}/create`
      });
    };

    const createExpectLegacyForbidden = username => resp => {
      expect(resp.body).to.eql({
        statusCode: 403,
        error: 'Forbidden',
        //eslint-disable-next-line max-len
        message: `action [indices:data/write/index] is unauthorized for user [${username}]: [security_exception] action [indices:data/write/index] is unauthorized for user [${username}]`
      });
    };

    describe(`${SPACES.DEFAULT.spaceId} space`, () => {
      const spaceId = SPACES.DEFAULT.spaceId;
      createTest(`not a kibana user`, {
        auth: {
          username: AUTHENTICATION.NOT_A_KIBANA_USER.USERNAME,
          password: AUTHENTICATION.NOT_A_KIBANA_USER.PASSWORD,
        },
        spaceId,
        tests: {
          spaceAware: {
            statusCode: 403,
            response: createExpectLegacyForbidden(AUTHENTICATION.NOT_A_KIBANA_USER.USERNAME),
          },
          notSpaceAware: {
            statusCode: 403,
            response: createExpectLegacyForbidden(AUTHENTICATION.NOT_A_KIBANA_USER.USERNAME),
          },
        }
      });

      createTest(`superuser`, {
        auth: {
          username: AUTHENTICATION.SUPERUSER.USERNAME,
          password: AUTHENTICATION.SUPERUSER.PASSWORD,
        },
        spaceId,
        tests: {
          spaceAware: {
            statusCode: 200,
            response: createExpectSpaceAwareResults(),
          },
          notSpaceAware: {
            statusCode: 200,
            response: expectNotSpaceAwareResults(),
          },
        }
      });

      createTest(`kibana legacy user`, {
        auth: {
          username: AUTHENTICATION.KIBANA_LEGACY_USER.USERNAME,
          password: AUTHENTICATION.KIBANA_LEGACY_USER.PASSWORD,
        },
        spaceId,
        tests: {
          spaceAware: {
            statusCode: 200,
            response: createExpectSpaceAwareResults(),
          },
          notSpaceAware: {
            statusCode: 200,
            response: expectNotSpaceAwareResults,
          },
        }
      });

      createTest(`kibana legacy dashboard only user`, {
        auth: {
          username: AUTHENTICATION.KIBANA_LEGACY_DASHBOARD_ONLY_USER.USERNAME,
          password: AUTHENTICATION.KIBANA_LEGACY_DASHBOARD_ONLY_USER.PASSWORD,
        },
        spaceId,
        tests: {
          spaceAware: {
            statusCode: 403,
            response: createExpectLegacyForbidden(AUTHENTICATION.KIBANA_LEGACY_DASHBOARD_ONLY_USER.USERNAME),
          },
          notSpaceAware: {
            statusCode: 403,
            response: createExpectLegacyForbidden(AUTHENTICATION.KIBANA_LEGACY_DASHBOARD_ONLY_USER.USERNAME),
          },
        }
      });

      createTest(`kibana dual-privileges user`, {
        auth: {
          username: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER.USERNAME,
          password: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER.PASSWORD,
        },
        spaceId,
        tests: {
          spaceAware: {
            statusCode: 200,
            response: createExpectSpaceAwareResults(),
          },
          notSpaceAware: {
            statusCode: 200,
            response: expectNotSpaceAwareResults,
          },
        }
      });

      createTest(`kibana dual-privileges dashboard only user`, {
        auth: {
          username: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER.USERNAME,
          password: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER.PASSWORD,
        },
        spaceId,
        tests: {
          spaceAware: {
            statusCode: 403,
            response: createExpectRbacForbidden(spaceAwareType),
          },
          notSpaceAware: {
            statusCode: 403,
            response: createExpectRbacForbidden(notSpaceAwareType),
          },
        }
      });

      createTest(`kibana rbac user`, {
        auth: {
          username: AUTHENTICATION.KIBANA_RBAC_USER.USERNAME,
          password: AUTHENTICATION.KIBANA_RBAC_USER.PASSWORD,
        },
        spaceId,
        tests: {
          spaceAware: {
            statusCode: 200,
            response: createExpectSpaceAwareResults(),
          },
          notSpaceAware: {
            statusCode: 200,
            response: expectNotSpaceAwareResults,
          },
        }
      });

      createTest(`kibana rbac dashboard only user`, {
        auth: {
          username: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER.USERNAME,
          password: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER.PASSWORD,
        },
        spaceId,
        tests: {
          spaceAware: {
            statusCode: 403,
            response: createExpectRbacForbidden(spaceAwareType),
          },
          notSpaceAware: {
            statusCode: 403,
            response: createExpectRbacForbidden(notSpaceAwareType),
          },
        }
      });

      createTest(`kibana rbac default space user`, {
        auth: {
          username: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_USER.USERNAME,
          password: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_USER.PASSWORD,
        },
        tests: {
          spaceAware: {
            statusCode: 200,
            response: createExpectSpaceAwareResults(spaceId),
          },
          notSpaceAware: {
            statusCode: 200,
            response: expectNotSpaceAwareResults(),
          },
        }
      });

      createTest(`kibana rbac space 1 readonly user`, {
        auth: {
          username: AUTHENTICATION.KIBANA_RBAC_SPACE_1_READONLY_USER.USERNAME,
          password: AUTHENTICATION.KIBANA_RBAC_SPACE_1_READONLY_USER.PASSWORD,
        },
        tests: {
          spaceAware: {
            statusCode: 403,
            response: createExpectRbacForbidden(spaceAwareType),
          },
          notSpaceAware: {
            statusCode: 403,
            response: createExpectRbacForbidden(notSpaceAwareType),
          },
        }
      });
    });

    describe(`${SPACES.SPACE_1.spaceId} space`, () => {
      const spaceId = SPACES.SPACE_1.spaceId;
      createTest(`not a kibana user`, {
        auth: {
          username: AUTHENTICATION.NOT_A_KIBANA_USER.USERNAME,
          password: AUTHENTICATION.NOT_A_KIBANA_USER.PASSWORD,
        },
        spaceId,
        tests: {
          spaceAware: {
            statusCode: 403,
            response: createExpectLegacyForbidden(AUTHENTICATION.NOT_A_KIBANA_USER.USERNAME),
          },
          notSpaceAware: {
            statusCode: 403,
            response: createExpectLegacyForbidden(AUTHENTICATION.NOT_A_KIBANA_USER.USERNAME),
          },
        }
      });

      createTest(`superuser`, {
        auth: {
          username: AUTHENTICATION.SUPERUSER.USERNAME,
          password: AUTHENTICATION.SUPERUSER.PASSWORD,
        },
        spaceId,
        tests: {
          spaceAware: {
            statusCode: 200,
            response: createExpectSpaceAwareResults(spaceId),
          },
          notSpaceAware: {
            statusCode: 200,
            response: expectNotSpaceAwareResults(),
          },
        }
      });

      createTest(`kibana legacy user`, {
        auth: {
          username: AUTHENTICATION.KIBANA_LEGACY_USER.USERNAME,
          password: AUTHENTICATION.KIBANA_LEGACY_USER.PASSWORD,
        },
        spaceId,
        tests: {
          spaceAware: {
            statusCode: 200,
            response: createExpectSpaceAwareResults(spaceId),
          },
          notSpaceAware: {
            statusCode: 200,
            response: expectNotSpaceAwareResults,
          },
        }
      });

      createTest(`kibana legacy dashboard only user`, {
        auth: {
          username: AUTHENTICATION.KIBANA_LEGACY_DASHBOARD_ONLY_USER.USERNAME,
          password: AUTHENTICATION.KIBANA_LEGACY_DASHBOARD_ONLY_USER.PASSWORD,
        },
        spaceId,
        tests: {
          spaceAware: {
            statusCode: 403,
            response: createExpectLegacyForbidden(AUTHENTICATION.KIBANA_LEGACY_DASHBOARD_ONLY_USER.USERNAME),
          },
          notSpaceAware: {
            statusCode: 403,
            response: createExpectLegacyForbidden(AUTHENTICATION.KIBANA_LEGACY_DASHBOARD_ONLY_USER.USERNAME),
          },
        }
      });

      createTest(`kibana dual-privileges user`, {
        auth: {
          username: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER.USERNAME,
          password: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER.PASSWORD,
        },
        spaceId,
        tests: {
          spaceAware: {
            statusCode: 200,
            response: createExpectSpaceAwareResults(spaceId),
          },
          notSpaceAware: {
            statusCode: 200,
            response: expectNotSpaceAwareResults,
          },
        }
      });

      createTest(`kibana dual-privileges dashboard only user`, {
        auth: {
          username: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER.USERNAME,
          password: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER.PASSWORD,
        },
        spaceId,
        tests: {
          spaceAware: {
            statusCode: 403,
            response: createExpectRbacForbidden(spaceAwareType),
          },
          notSpaceAware: {
            statusCode: 403,
            response: createExpectRbacForbidden(notSpaceAwareType),
          },
        }
      });

      createTest(`kibana rbac user`, {
        auth: {
          username: AUTHENTICATION.KIBANA_RBAC_USER.USERNAME,
          password: AUTHENTICATION.KIBANA_RBAC_USER.PASSWORD,
        },
        spaceId,
        tests: {
          spaceAware: {
            statusCode: 200,
            response: createExpectSpaceAwareResults(spaceId),
          },
          notSpaceAware: {
            statusCode: 200,
            response: expectNotSpaceAwareResults,
          },
        }
      });

      createTest(`kibana rbac dashboard only user`, {
        auth: {
          username: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER.USERNAME,
          password: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER.PASSWORD,
        },
        spaceId,
        tests: {
          spaceAware: {
            statusCode: 403,
            response: createExpectRbacForbidden(spaceAwareType),
          },
          notSpaceAware: {
            statusCode: 403,
            response: createExpectRbacForbidden(notSpaceAwareType),
          },
        }
      });

      createTest(`kibana rbac default space user`, {
        auth: {
          username: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_USER.USERNAME,
          password: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_USER.PASSWORD,
        },
        spaceId,
        tests: {
          spaceAware: {
            statusCode: 403,
            response: createExpectRbacForbidden(spaceAwareType),
          },
          notSpaceAware: {
            statusCode: 403,
            response: createExpectRbacForbidden(notSpaceAwareType),
          },
        }
      });

      createTest(`kibana rbac space 1 readonly user`, {
        auth: {
          username: AUTHENTICATION.KIBANA_RBAC_SPACE_1_READONLY_USER.USERNAME,
          password: AUTHENTICATION.KIBANA_RBAC_SPACE_1_READONLY_USER.PASSWORD,
        },
        spaceId,
        tests: {
          spaceAware: {
            statusCode: 403,
            response: createExpectRbacForbidden(spaceAwareType),
          },
          notSpaceAware: {
            statusCode: 403,
            response: createExpectRbacForbidden(notSpaceAwareType),
          },
        }
      });
    });
  });
}
