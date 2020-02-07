/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RawKibanaPrivileges, RoleKibanaPrivilege } from '../../../../../common/model';
import { Privilege, PrivilegeType } from './privilege_instance';
import { PrivilegeCollection } from './privilege_collection';
import { SecuredFeature } from '../secured_feature';
import { Feature } from '../../../../../../features/common';
import { isGlobalPrivilegeDefinition } from '../../edit_role/privilege_utils';

function toPrivilege(type: PrivilegeType, entry: [string, string[]]): [string, Privilege] {
  const [privilegeId, actions] = entry;
  return [privilegeId, new Privilege(type, privilegeId, actions)];
}

function recordsToPrivilegeMap(
  type: PrivilegeType,
  record: Record<string, string[]>
): ReadonlyMap<string, Privilege> {
  return new Map(Object.entries(record).map(entry => toPrivilege(type, entry)));
}

export class KibanaPrivileges {
  private global: ReadonlyMap<string, Privilege>;

  private spaces: ReadonlyMap<string, Privilege>;

  private feature: ReadonlyMap<string, SecuredFeature>;

  constructor(rawKibanaPrivileges: RawKibanaPrivileges, features: Feature[]) {
    this.global = recordsToPrivilegeMap('base', rawKibanaPrivileges.global);
    this.spaces = recordsToPrivilegeMap('base', rawKibanaPrivileges.space);
    this.feature = new Map(
      features.map(feature => {
        const rawPrivs = rawKibanaPrivileges.features[feature.id];
        return [feature.id, new SecuredFeature(feature.toRaw(), rawPrivs)];
      })
    );
  }

  public getBasePrivileges(entry: RoleKibanaPrivilege) {
    if (isGlobalPrivilegeDefinition(entry)) {
      return Array.from(this.global.values());
    }
    return Array.from(this.spaces.values());
  }

  public getSecuredFeature(featureId: string) {
    return this.feature.get(featureId)!;
  }

  public getSecuredFeatures() {
    return Array.from(this.feature.values());
  }

  public createCollectionFromRoleKibanaPrivileges(roleKibanaPrivileges: RoleKibanaPrivilege[]) {
    const filterAssigned = (assignedPrivileges: string[]) => (privilege: Privilege) =>
      assignedPrivileges.includes(privilege.id);

    const privileges: Privilege[] = roleKibanaPrivileges
      .map(rkp => {
        const basePrivileges = this.getBasePrivileges(rkp).filter(filterAssigned(rkp.base));
        const featurePrivileges: Privilege[][] = Object.entries(rkp.feature).map(
          ([featureId, assignedFeaturePrivs]) => {
            return this.getFeaturePrivileges(featureId).filter(
              filterAssigned(assignedFeaturePrivs)
            );
          }
        );

        return [basePrivileges, featurePrivileges].flat<Privilege>(2);
      })
      .flat<Privilege>();

    return new PrivilegeCollection(privileges);
  }

  private getFeaturePrivileges(featureId: string) {
    return this.getSecuredFeature(featureId).allPrivileges ?? [];
  }
}
