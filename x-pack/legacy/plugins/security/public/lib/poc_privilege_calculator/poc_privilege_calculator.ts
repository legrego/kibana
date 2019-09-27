/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import _ from 'lodash';
import { NO_PRIVILEGE_VALUE } from 'plugins/security/views/management/edit_role/lib/constants';
import { KibanaPrivileges, RoleKibanaPrivilege } from '../../../common/model';
import { areActionsFullyCovered } from '../../../common/privilege_calculator_utils';

export class POCPrivilegeCalculator {
  constructor(private readonly kibanaPrivileges: KibanaPrivileges) {}

  public getEffectiveGlobalBasePrivilege(assignedPrivileges: RoleKibanaPrivilege[]) {
    const actionMap = {
      all: this.kibanaPrivileges.getGlobalPrivileges().getActions('all'),
      read: this.kibanaPrivileges.getGlobalPrivileges().getActions('read'),
    };
    const assignedActions = this.collectAssignedGlobalActions(assignedPrivileges);
    if (areActionsFullyCovered(assignedActions, actionMap.all)) {
      return 'all';
    }
    if (areActionsFullyCovered(assignedActions, actionMap.read)) {
      return 'read';
    }
    return NO_PRIVILEGE_VALUE;
  }

  public getEffectiveSpaceBasePrivilege(
    assignedPrivileges: RoleKibanaPrivilege[],
    spaceId: string
  ) {
    const actionMap = {
      all: this.kibanaPrivileges.getSpacesPrivileges().getActions('all'),
      read: this.kibanaPrivileges.getSpacesPrivileges().getActions('read'),
    };
    const assignedActions = this.collectAssignedSpaceActions(assignedPrivileges, spaceId);
    if (areActionsFullyCovered(assignedActions, actionMap.all)) {
      return 'all';
    }
    if (areActionsFullyCovered(assignedActions, actionMap.read)) {
      return 'read';
    }
    return NO_PRIVILEGE_VALUE;
  }

  public getEffectiveGlobalFeaturePrivileges(
    assignedPrivileges: RoleKibanaPrivilege[],
    featureId: string
  ) {
    const assignedActions = this.collectAssignedGlobalActions(assignedPrivileges);

    return this.kibanaPrivileges
      .getFeaturePrivileges()
      .getPrivileges(featureId)
      .filter(privilege => {
        const privilegeActions = this.kibanaPrivileges
          .getFeaturePrivileges()
          .getActions(featureId, privilege);

        const missing = privilegeActions.filter(pa => !assignedActions.includes(pa));

        const covered = areActionsFullyCovered(assignedActions, privilegeActions);
        console.log({ featureId, privilege, covered, privilegeActions, assignedActions, missing });
        return covered;
      });
  }

  public getEffectiveSpaceFeaturePrivileges(
    assignedPrivileges: RoleKibanaPrivilege[],
    spaceId: string,
    featureId: string
  ): string[] {
    const assignedActions = this.collectAssignedSpaceActions(assignedPrivileges, spaceId);

    return this.kibanaPrivileges
      .getFeaturePrivileges()
      .getPrivileges(featureId)
      .filter(privilege => {
        const privilegeActions = this.kibanaPrivileges
          .getFeaturePrivileges()
          .getActions(featureId, privilege);

        return areActionsFullyCovered(assignedActions, privilegeActions);
      });
  }

  public getInheritedSpaceFeaturePrivileges(
    assignedPrivileges: RoleKibanaPrivilege[],
    spaceId: string,
    featureId: string
  ): string[] {
    const otherPrivileges = assignedPrivileges.filter(ap => !ap.spaces.includes(spaceId));
    return this.getEffectiveSpaceFeaturePrivileges(otherPrivileges, spaceId, featureId);
  }

  public canToggleFeaturePrivilege(
    assignedPrivileges: RoleKibanaPrivilege[],
    spaceId: string,
    featureId: string,
    privilegeId: string
  ) {
    const privilegesWithoutCandidate = this.getAssignedPrivilegesWithoutCandidateFeaturePrivilege(
      assignedPrivileges,
      spaceId,
      featureId,
      privilegeId
    );

    return !this.getEffectiveSpaceFeaturePrivileges(
      privilegesWithoutCandidate,
      spaceId,
      featureId
    ).includes(privilegeId);
  }

  public getPrivilegesResponsibleForFeaturePrivilegeGrant(
    assignedPrivileges: RoleKibanaPrivilege[],
    spaceId: string,
    featureId: string,
    privilegeId: string
  ) {
    const privilegesWithoutCandidate = this.getAssignedPrivilegesWithoutCandidateFeaturePrivilege(
      assignedPrivileges,
      spaceId,
      featureId,
      privilegeId
    );

    const privilegeActions = this.kibanaPrivileges
      .getFeaturePrivileges()
      .getActions(featureId, privilegeId);

    const responsiblePrivileges = {
      global: {
        base: [] as string[],
        feature: {} as any,
      },
      [spaceId]: {
        base: [] as string[],
        feature: {} as any,
      },
    };

    privilegesWithoutCandidate.forEach(privilege => {
      const responsibleBase = privilege.base.filter(basePriv => {
        const actions = this.kibanaPrivileges.getGlobalPrivileges().getActions(basePriv);
        return areActionsFullyCovered(privilegeActions, actions);
      });

      const responsibleFeatures = (privilege.feature[featureId] || []).filter(featurePriv => {
        const actions = this.kibanaPrivileges
          .getFeaturePrivileges()
          .getActions(featureId, featurePriv);
        const covered = areActionsFullyCovered(actions, privilegeActions);

        const missing = privilegeActions.filter(pa => !actions.includes(pa));

        console.log('candidate', { featureId, featurePriv, covered, missing });

        return covered;
      });

      responsiblePrivileges.global.base.push(...responsibleBase);
      responsiblePrivileges.global.feature[featureId] = responsibleFeatures;
    });

    return responsiblePrivileges;
  }

  public getAssignedSpaceFeaturePrivileges(
    assignedPrivileges: RoleKibanaPrivilege[],
    spaceId: string,
    featureId: string
  ): string[] {
    return _.uniq(
      assignedPrivileges
        .filter(ap => ap.spaces.includes(spaceId))
        .reduce(
          (acc, ap) => {
            return [...acc, ...(ap.feature[featureId] || [])];
          },
          [] as string[]
        )
    );
  }

  private getAssignedPrivilegesWithoutCandidateFeaturePrivilege(
    assignedPrivileges: RoleKibanaPrivilege[],
    spaceId: string,
    featureId: string,
    candidatePrivilegeId: string
  ): RoleKibanaPrivilege[] {
    const privilegesWithoutCandidate = _.cloneDeep(
      assignedPrivileges.filter(ap => ap.spaces.includes(spaceId))
    );
    privilegesWithoutCandidate.forEach(p => {
      p.feature[featureId] = (p.feature[featureId] || []).filter(fp => fp !== candidatePrivilegeId);
    });
    return privilegesWithoutCandidate;
  }

  private collectAssignedGlobalActions(assignedPrivileges: RoleKibanaPrivilege[]): string[] {
    const globalPrivileges = this.kibanaPrivileges.getGlobalPrivileges();
    const featurePrivileges = this.kibanaPrivileges.getFeaturePrivileges();

    const assignedActions = assignedPrivileges
      .filter(ap => ap.spaces.length === 0 || ap.spaces.includes('*'))
      .map(ap => {
        const global = ap.base.map(b => globalPrivileges.getActions(b));
        const feature = Object.entries(ap.feature).map(([featureId, featurePrivs]) =>
          featurePrivs.map(fp => featurePrivileges.getActions(featureId, fp))
        );

        return [global, feature];
      })
      .flat(4);

    return _.uniq(assignedActions);
  }

  private collectAssignedSpaceActions(
    assignedPrivileges: RoleKibanaPrivilege[],
    spaceId: string
  ): string[] {
    const spacePrivileges = this.kibanaPrivileges.getSpacesPrivileges();
    const featurePrivileges = this.kibanaPrivileges.getFeaturePrivileges();

    const assignedActions = assignedPrivileges
      .filter(ap => ap.spaces.includes(spaceId))
      .map(ap => {
        const space = ap.base.map(b => spacePrivileges.getActions(b));
        const feature = Object.entries(ap.feature).map(([featureId, featurePrivs]) =>
          featurePrivs.map(fp => featurePrivileges.getActions(featureId, fp))
        );

        return [space, feature];
      })
      .flat(4)
      .concat(this.collectAssignedGlobalActions(assignedPrivileges));

    return _.uniq(assignedActions);
  }
}
