/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { flatten } from 'lodash';
import {
  Feature,
  FeatureKibanaPrivileges,
  CustomFeatureKibanaPrivileges,
} from '../../../../../../../../plugins/features/server';
import { Actions } from '../../actions';
import { FeaturePrivilegeApiBuilder } from './api';
import { FeaturePrivilegeAppBuilder } from './app';
import { FeaturePrivilegeCatalogueBuilder } from './catalogue';
import { FeaturePrivilegeBuilder } from './feature_privilege_builder';
import { FeaturePrivilegeManagementBuilder } from './management';
import { FeaturePrivilegeNavlinkBuilder } from './navlink';
import { FeaturePrivilegeSavedObjectBuilder } from './saved_object';
import { FeaturePrivilegeUIBuilder } from './ui';
export { FeaturePrivilegeBuilder };

export const collectFeaturePrivileges = (feature: Feature) => {
  return [
    ['minimum', feature.privileges.minimum],
    ['read', feature.privileges.read],
    ['all', feature.privileges.all],
    ...(feature.privileges.custom
      ? feature.privileges.custom.map(o => o.privileges.map(op => [op.id, op])).flat()
      : []),
  ].filter(([, priv]) => Boolean(priv)) as Array<
    [string, FeatureKibanaPrivileges | CustomFeatureKibanaPrivileges]
  >;
};

export const featurePrivilegeBuilderFactory = (actions: Actions): FeaturePrivilegeBuilder => {
  const builders = [
    new FeaturePrivilegeApiBuilder(actions),
    new FeaturePrivilegeAppBuilder(actions),
    new FeaturePrivilegeCatalogueBuilder(actions),
    new FeaturePrivilegeManagementBuilder(actions),
    new FeaturePrivilegeNavlinkBuilder(actions),
    new FeaturePrivilegeSavedObjectBuilder(actions),
    new FeaturePrivilegeUIBuilder(actions),
  ];

  return {
    getActions(privilege: FeatureKibanaPrivileges, feature: Feature) {
      return flatten(builders.map(builder => builder.getActions(privilege, feature)));
    },
  };
};
