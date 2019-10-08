/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import _ from 'lodash';
import { NO_PRIVILEGE_VALUE } from 'plugins/security/views/management/edit_role/lib/constants';
import { KibanaPrivileges, RoleKibanaPrivilege } from '../../../common/model';

export class POCPrivilegeCalculator {
  constructor(private readonly kibanaPrivileges: KibanaPrivileges) {}

  public getEffectiveBasePrivilege(assignedPrivileges: RoleKibanaPrivilege[], spaces: string[]) {
    const actionFactory = this.isGlobalPrivilege({ spaces })
      ? (privilege: string) => this.kibanaPrivileges.getGlobalPrivileges().getActions(privilege)
      : (privilege: string) => this.kibanaPrivileges.getSpacesPrivileges().getActions(privilege);

    const assignedActions = this.collectAssignedActions(assignedPrivileges, spaces);

    if (this.checkActions(assignedActions, actionFactory('all')).hasAllRequested) {
      return 'all';
    }
    if (this.checkActions(assignedActions, actionFactory('read')).hasAllRequested) {
      return 'read';
    }
    return NO_PRIVILEGE_VALUE;
  }

  public getEffectiveFeaturePrivileges(
    assignedPrivileges: RoleKibanaPrivilege[],
    spaces: string[],
    featureId: string
  ) {
    const assignedActions = this.collectAssignedActions(assignedPrivileges, spaces);

    return this.kibanaPrivileges
      .getFeaturePrivileges()
      .getPrivileges(featureId)
      .filter(privilege => {
        const privilegeActions = this.kibanaPrivileges
          .getFeaturePrivileges()
          .getActions(featureId, privilege);

        const { hasAllRequested } = this.checkActions(assignedActions, privilegeActions);

        return hasAllRequested;
      });
  }

  public getInheritedFeaturePrivileges(
    assignedPrivileges: RoleKibanaPrivilege[],
    spaces: string[],
    featureId: string
  ): string[] {
    const key = this.getKey(spaces);
    const otherPrivileges = assignedPrivileges.filter(ap => this.getKey(ap.spaces) !== key);
    return this.getEffectiveFeaturePrivileges(otherPrivileges, spaces, featureId);
  }

  public canToggleFeaturePrivilege(
    assignedPrivileges: RoleKibanaPrivilege[],
    spaces: string[],
    featureId: string,
    privilegeId: string
  ) {
    const privilegesWithoutCandidate = this.getAssignedPrivilegesWithoutCandidateFeaturePrivilege(
      assignedPrivileges,
      spaces,
      featureId,
      privilegeId
    );

    return !this.getEffectiveFeaturePrivileges(
      privilegesWithoutCandidate,
      spaces,
      featureId
    ).includes(privilegeId);
  }

  public explainAllEffectiveFeaturePrivileges(
    assignedPrivileges: RoleKibanaPrivilege[],
    spaces: string[]
  ): { [featureId: string]: { [privilegeId: string]: { global: any; space: any } } } {
    const featurePrivileges = this.kibanaPrivileges.getFeaturePrivileges().getAllPrivileges();
    return Object.entries(featurePrivileges).reduce((acc, entry) => {
      const [featureId, privileges] = entry;
      return {
        ...acc,
        [featureId]: privileges.reduce((acc2, privilegeId) => {
          return {
            ...acc2,
            [privilegeId]: this.explainEffectiveFeaturePrivilege(
              assignedPrivileges,
              spaces,
              featureId,
              privilegeId
            ),
          };
        }, {}),
      };
    }, {});
  }

  public explainEffectiveFeaturePrivilege(
    assignedPrivileges: RoleKibanaPrivilege[],
    spaces: string[],
    featureId: string,
    privilegeId: string
  ) {
    const privilegesWithoutCandidate = this.getAssignedPrivilegesWithoutCandidateFeaturePrivilege(
      assignedPrivileges,
      spaces,
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
      space: {
        base: [] as string[],
        feature: {} as any,
      },
    };

    privilegesWithoutCandidate.forEach(privilege => {
      const responsibleFeatures = (privilege.feature[featureId] || []).filter(featurePriv => {
        const actions = this.kibanaPrivileges
          .getFeaturePrivileges()
          .getActions(featureId, featurePriv);
        const { hasAllRequested } = this.checkActions(actions, privilegeActions);

        return hasAllRequested;
      });

      const isGlobalPrivilege = this.isGlobalPrivilege(privilege);

      if (isGlobalPrivilege) {
        const responsibleGlobalBase = privilege.base.filter(basePriv => {
          const actions = this.kibanaPrivileges.getGlobalPrivileges().getActions(basePriv);
          return this.checkActions(actions, privilegeActions).hasAllRequested;
        });

        responsiblePrivileges.global.base.push(...responsibleGlobalBase);
        if (responsibleFeatures.length > 0) {
          responsiblePrivileges.global.feature[featureId] = responsibleFeatures;
        }
      } else {
        const responsibleSpaceBase = privilege.base.filter(basePriv => {
          const actions = this.kibanaPrivileges.getSpacesPrivileges().getActions(basePriv);
          return this.checkActions(actions, privilegeActions).hasAllRequested;
        });
        responsiblePrivileges.space.base.push(...responsibleSpaceBase);
        if (responsibleFeatures.length > 0) {
          responsiblePrivileges.space.feature[featureId] = responsibleFeatures;
        }
      }
    });

    return responsiblePrivileges;
  }

  public getAssignedFeaturePrivileges(
    assignedPrivileges: RoleKibanaPrivilege[],
    spaces: string[],
    featureId: string
  ): string[] {
    return _.uniq(
      this.getRelevantPrivileges(assignedPrivileges, spaces).reduce(
        (acc, ap) => {
          return [...acc, ...(ap.feature[featureId] || [])];
        },
        [] as string[]
      )
    );
  }

  private getRelevantPrivileges(
    assignedPrivileges: RoleKibanaPrivilege[],
    spaces: string[],
    includeGlobal = false
  ) {
    const key = this.getKey(spaces);

    return assignedPrivileges.filter(
      ap => this.getKey(ap.spaces) === key || (includeGlobal && this.isGlobalPrivilege(ap))
    );
  }

  private checkActions(actions: string[], candidateSubsetOfActions: string[]) {
    const missingActions = candidateSubsetOfActions.filter(action => !actions.includes(action));

    const hasAllRequested = missingActions.length === 0;

    return {
      missingActions,
      hasAllRequested,
    };
  }

  private getAssignedPrivilegesWithoutCandidateFeaturePrivilege(
    assignedPrivileges: RoleKibanaPrivilege[],
    spaces: string[],
    featureId: string,
    candidatePrivilegeId: string
  ): RoleKibanaPrivilege[] {
    const isGlobalPrivilege = this.isGlobalPrivilege({ spaces });

    const privilegesWithoutCandidate = _.cloneDeep(
      this.getRelevantPrivileges(assignedPrivileges, spaces, true)
    );
    privilegesWithoutCandidate.forEach(p => {
      p.feature[featureId] = (p.feature[featureId] || []).filter(
        fp => fp !== candidatePrivilegeId || (!isGlobalPrivilege && this.isGlobalPrivilege(p))
      );
    });
    return privilegesWithoutCandidate;
  }

  private collectAssignedGlobalActions(assignedPrivileges: RoleKibanaPrivilege[]): string[] {
    const globalPrivileges = this.kibanaPrivileges.getGlobalPrivileges();
    const featurePrivileges = this.kibanaPrivileges.getFeaturePrivileges();

    const assignedActions = assignedPrivileges
      .filter(this.isGlobalPrivilege)
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
    spaces: string[]
  ): string[] {
    const spacePrivileges = this.kibanaPrivileges.getSpacesPrivileges();
    const featurePrivileges = this.kibanaPrivileges.getFeaturePrivileges();

    const assignedActions = this.getRelevantPrivileges(assignedPrivileges, spaces)
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

  private collectAssignedActions(assignedPrivileges: RoleKibanaPrivilege[], spaces: string[]) {
    if (this.isGlobalPrivilege({ spaces })) {
      return this.collectAssignedGlobalActions(assignedPrivileges);
    }
    return this.collectAssignedSpaceActions(assignedPrivileges, spaces);
  }

  private isGlobalPrivilege({ spaces }: { spaces: string[] }) {
    return spaces.includes('*');
  }

  private getKey(spaces: string[]): string {
    return spaces.join(':');
  }
}
