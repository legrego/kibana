/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { flatten, mapValues, uniq } from 'lodash';
import { FeatureKibanaPrivileges } from '../../../../../../../plugins/features/server/feature_kibana_privileges';
import { Feature } from '../../../../../../../plugins/features/server';
import { XPackMainPlugin } from '../../../../../xpack_main/xpack_main';
import { RawKibanaFeaturePrivileges, RawKibanaPrivileges } from '../../../../common/model';
import { Actions } from '../actions';
import { featurePrivilegeBuilderFactory } from './feature_privilege_builder';

export interface PrivilegesService {
  get(): RawKibanaPrivileges;
}

function* recFeaturePrivileges(g: Feature['privileges']): Generator<FeatureKibanaPrivileges> {
  for (const p of g.required) {
    yield p.get();
  }
  if (g.optional) {
    for (const g2 of g.optional) {
      for (const g3 of g2.privileges) {
        yield g3.get();
      }
    }
  }
}

export function privilegesFactory(actions: Actions, xpackMainPlugin: XPackMainPlugin) {
  const featurePrivilegeBuilder = featurePrivilegeBuilderFactory(actions);

  return {
    get() {
      const features = xpackMainPlugin.getFeatures();
      const basePrivilegeFeatures = features.filter(feature => !feature.excludeFromBasePrivileges);

      const allActions = uniq(
        flatten(
          basePrivilegeFeatures.map(feature => {
            const featureActions: string[] = [];
            for (const fp of recFeaturePrivileges(feature.privileges)) {
              if (!fp.excludeFromBasePrivileges) {
                const privilegeActions = featurePrivilegeBuilder.getActions(fp, feature);
                console.log(feature.id, fp.id, 'produced', privilegeActions);
                featureActions.push(...privilegeActions);
              }
            }
            return featureActions;
          })
        )
      );

      const readActions = uniq(
        flatten(
          basePrivilegeFeatures.map(feature => {
            const featureActions = [];
            for (const fp of recFeaturePrivileges(feature.privileges)) {
              if (fp.id === 'read' && !fp.excludeFromBasePrivileges) {
                featureActions.push(...featurePrivilegeBuilder.getActions(fp, feature));
              }
            }
            return featureActions;
          })
        )
      );

      return {
        features: features.reduce((acc: RawKibanaFeaturePrivileges, feature: Feature) => {
          if (feature.privileges.required.length > 0) {
            console.log('creating feature privs for ', feature.id);

            acc[feature.id] = {};

            for (const featurePrivilege of recFeaturePrivileges(feature.privileges)) {
              console.log('inside generator loop for ', featurePrivilege.id);
              acc[feature.id][featurePrivilege.id] = [
                actions.login,
                actions.version,
                ...featurePrivilegeBuilder.getActions(featurePrivilege, feature),
                ...(featurePrivilege.id === 'all' ? [actions.allHack] : []),
              ];
            }
          }
          return acc;
        }, {}),
        global: {
          all: [
            actions.login,
            actions.version,
            actions.api.get('features'),
            actions.space.manage,
            actions.ui.get('spaces', 'manage'),
            actions.ui.get('management', 'kibana', 'spaces'),
            ...allActions,
            actions.allHack,
          ],
          read: [actions.login, actions.version, ...readActions],
        },
        space: {
          all: [actions.login, actions.version, ...allActions, actions.allHack],
          read: [actions.login, actions.version, ...readActions],
        },
        reserved: features.reduce((acc: Record<string, string[]>, feature: Feature) => {
          if (feature.reserved) {
            acc[feature.id] = [
              actions.version,
              ...featurePrivilegeBuilder.getActions(feature.reserved!.privilege, feature),
            ];
          }
          return acc;
        }, {}),
      };
    },
  };
}
