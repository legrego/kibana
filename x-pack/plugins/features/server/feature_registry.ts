/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep, uniq } from 'lodash';
import {
  FeatureKibanaPrivileges,
  CustomFeatureKibanaPrivileges,
} from './feature_kibana_privileges';
import { Feature, FeatureWithAllOrReadPrivileges } from './feature';
import { validateFeature } from './feature_schema';

export class FeatureRegistry {
  private locked = false;
  private features: Record<string, Feature> = {};

  public register(feature: FeatureWithAllOrReadPrivileges) {
    if (this.locked) {
      throw new Error(`Features are locked, can't register new features`);
    }

    validateFeature(feature);

    if (feature.id in this.features) {
      throw new Error(`Feature with id ${feature.id} is already registered.`);
    }

    const featureCopy: Feature = cloneDeep(feature as Feature);

    this.features[feature.id] = applyAutomaticPrivilegeGrants(featureCopy as Feature);
  }

  public getAll(): Feature[] {
    this.locked = true;
    return cloneDeep(Object.values(this.features));
  }
}

function applyAutomaticPrivilegeGrants(feature: Feature): Feature {
  const { all: allPrivilege, read: readPrivilege, minimum, custom } = feature.privileges;
  const reservedPrivilege = feature.reserved ? feature.reserved.privilege : null;

  feature.privileges.minimum = minimum || {
    savedObject: {
      all: [],
      read: [],
    },
    ui: [],
  };

  if (custom && custom.length > 0) {
    const customPrivileges = [
      {
        categoryName: 'General',
        privileges: [
          {
            id: 'accessApplication',
            name: 'Access application',
            privilegeType: 'read',
            savedObject: {
              all: [],
              read: [],
            },
            ui: [],
          },
        ] as CustomFeatureKibanaPrivileges[],
      },
      ...(custom || []),
    ];
    feature.privileges.custom = customPrivileges;
    applyAutomaticCustomPrivilegeGrants(...customPrivileges);
  }

  applyAutomaticAllPrivilegeGrants(allPrivilege, reservedPrivilege);
  applyAutomaticReadPrivilegeGrants(readPrivilege);

  return feature;
}

function applyAutomaticAllPrivilegeGrants(...allPrivileges: Array<FeatureKibanaPrivileges | null>) {
  allPrivileges.forEach(allPrivilege => {
    if (allPrivilege) {
      allPrivilege.savedObject.all = uniq([...allPrivilege.savedObject.all, 'telemetry']);
      allPrivilege.savedObject.read = uniq([...allPrivilege.savedObject.read, 'config', 'url']);
    }
  });
}

function applyAutomaticReadPrivilegeGrants(
  ...readPrivileges: Array<FeatureKibanaPrivileges | null>
) {
  readPrivileges.forEach(readPrivilege => {
    if (readPrivilege) {
      readPrivilege.savedObject.read = uniq([...readPrivilege.savedObject.read, 'config', 'url']);
    }
  });
}

function applyAutomaticCustomPrivilegeGrants(
  ...customPrivileges: Array<{ categoryName: string; privileges: CustomFeatureKibanaPrivileges[] }>
) {
  customPrivileges.forEach(category => {
    category.privileges.forEach(privilege => {
      if (privilege.privilegeType === 'all') {
        privilege.savedObject.all = uniq([...privilege.savedObject.all, 'telemetry']);
      }

      if (privilege.privilegeType !== 'excluded') {
        privilege.savedObject.read = uniq([...privilege.savedObject.read, 'config', 'url']);
      }
    });
  });
}
