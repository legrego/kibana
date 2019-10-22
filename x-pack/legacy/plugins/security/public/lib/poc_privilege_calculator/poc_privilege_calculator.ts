/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import _ from 'lodash';
import { KibanaPrivileges } from '../../../common/model/poc_kibana_privileges';
import { Role } from '../../../common/model';
import { PrivilegeCollection } from '../../../common/model/poc_kibana_privileges/privilege_collection';

export class POCPrivilegeCalculator {
  constructor(private readonly kibanaPrivileges: KibanaPrivileges) {}

  public _locateGlobalPrivilege(role: Role) {
    return role.kibana.find(entry => this.isGlobalPrivilege(entry));
  }
  public _collectRelevantEntries(role: Role, privilegeIndex: number) {
    const entry = role.kibana[privilegeIndex];
    const globalEntry = this._locateGlobalPrivilege(role);
    if (!globalEntry || globalEntry === entry) {
      return [entry];
    }
    return [entry, globalEntry];
  }

  public getEffectiveBasePrivilege(role: Role, privilegeIndex: number) {
    const privilegeSet = role.kibana[privilegeIndex];

    const entries = this._collectRelevantEntries(role, privilegeIndex);
    const collection = this.kibanaPrivileges.createCollectionFromRoleKibanaPrivileges(entries);

    const basePrivileges = this.isGlobalPrivilege(privilegeSet)
      ? this.kibanaPrivileges.getGlobalPrivileges()
      : this.kibanaPrivileges.getSpacesPrivileges();

    const effectiveBasePrivilege = basePrivileges.find(
      base => collection.grantsPrivilege(base).hasAllRequested
    );

    return effectiveBasePrivilege;
  }

  public getEffectiveFeaturePrivileges(role: Role, privilegeIndex: number, featureId: string) {
    const entries = this._collectRelevantEntries(role, privilegeIndex);
    const collection = this.kibanaPrivileges.createCollectionFromRoleKibanaPrivileges(entries);

    return this.kibanaPrivileges.getFeaturePrivileges(featureId).filter(privilege => {
      const { hasAllRequested, missing } = collection.grantsPrivilege(privilege);
      console.log({ featureId, privilege, hasAllRequested, missing });
      return hasAllRequested;
    });
  }

  public getInheritedFeaturePrivileges(role: Role, privilegeIndex: number, featureId: string) {
    const assignedFeaturePrivileges = role.kibana[privilegeIndex];
    const otherPrivileges = role.kibana.filter(
      kp => kp !== assignedFeaturePrivileges && this.isGlobalPrivilege(kp)
    );
    const collection = this.kibanaPrivileges.createCollectionFromRoleKibanaPrivileges(
      otherPrivileges
    );

    return this.kibanaPrivileges.getFeaturePrivileges(featureId).filter(privilege => {
      return collection.grantsPrivilege(privilege).hasAllRequested;
    });
  }

  // public canToggleFeaturePrivilege(
  //   assignedPrivileges: RoleKibanaPrivilege[],
  //   spaces: string[],
  //   featureId: string,
  //   privilegeId: string
  // ) {
  //   const privilegesWithoutCandidate = this.getAssignedPrivilegesWithoutCandidateFeaturePrivilege(
  //     assignedPrivileges,
  //     spaces,
  //     featureId,
  //     privilegeId
  //   );

  //   return !this.getEffectiveFeaturePrivileges(
  //     privilegesWithoutCandidate,
  //     spaces,
  //     featureId
  //   ).includes(privilegeId);
  // }

  public explainAllEffectiveFeaturePrivileges(
    role: Role,
    privilegeIndex: number
  ): { [featureId: string]: { [privilegeId: string]: { global: any; space: any } } } {
    const featurePrivileges = this.kibanaPrivileges.getAllFeaturePrivileges();

    const result: ReturnType<POCPrivilegeCalculator['explainAllEffectiveFeaturePrivileges']> = {};

    for (const featurePrivilegeEntry of featurePrivileges.entries()) {
      const [featureId, privileges] = featurePrivilegeEntry;
      result[featureId] = {};
      for (const featurePrivilege of privileges) {
        const [privilegeId] = featurePrivilege;
        result[featureId][privilegeId] = this.explainEffectiveFeaturePrivilege(
          role,
          privilegeIndex,
          featureId,
          privilegeId
        );
      }
    }
    return result;
  }

  public explainEffectiveFeaturePrivilege(
    role: Role,
    privilegeIndex: number,
    featureId: string,
    privilegeId: string
  ) {
    const privilegesWithoutCandidate = this.getAssignedPrivilegesWithoutCandidateFeaturePrivilege(
      role,
      privilegeIndex,
      featureId,
      privilegeId
    );

    const privilege = this.kibanaPrivileges
      .getFeaturePrivileges(featureId)
      .find(p => p.id === privilegeId)!;

    const grantingPrivileges = privilegesWithoutCandidate.getPrivilegesGranting(privilege);

    return {
      global: {
        base: grantingPrivileges.filter(gp => gp.type === 'global'),
        // TODO: global feature privs
      },
      space: {
        base: grantingPrivileges.filter(gp => gp.type === 'space'),
        feature: grantingPrivileges.filter(gp => gp.type === 'feature'),
      },
    };
  }

  public getAssignedFeaturePrivileges(role: Role, privilegeIndex: number, featureId: string) {
    const entry = role.kibana[privilegeIndex];
    const collection = this.kibanaPrivileges.createCollectionFromRoleKibanaPrivileges([entry]);

    const featurePrivileges = this.kibanaPrivileges.getFeaturePrivileges(featureId);
    return featurePrivileges.filter(fp => collection.grantsPrivilege(fp).hasAllRequested);
  }

  private getAssignedPrivilegesWithoutCandidateFeaturePrivilege(
    role: Role,
    privilegeIndex: number,
    featureId: string,
    candidatePrivilegeId: string
  ): PrivilegeCollection {
    const entries = this._collectRelevantEntries(role, privilegeIndex);
    const collection = this.kibanaPrivileges.createCollectionFromRoleKibanaPrivileges(entries);

    return collection.without({ type: 'feature', id: candidatePrivilegeId });
  }

  private isGlobalPrivilege({ spaces }: { spaces: string[] }) {
    return spaces.includes('*');
  }
}
