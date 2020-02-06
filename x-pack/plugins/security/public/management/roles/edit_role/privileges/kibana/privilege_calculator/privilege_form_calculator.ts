/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Role } from '../../../../../../../common/model';
import { isGlobalPrivilegeDefinition } from '../../../privilege_utils';
import { KibanaPrivileges, SubFeaturePrivilege, SubFeaturePrivilegeGroup } from '../../../../model';

export class PrivilegeFormCalculator {
  constructor(
    private readonly kibanaPrivileges: KibanaPrivileges,
    private readonly role: Role,
    private readonly editingIndex: number
  ) {}

  public getSecuredFeatures() {
    return this.kibanaPrivileges.getSecuredFeatures();
  }

  public getFeaturePrivileges(featureId: string) {
    return this.kibanaPrivileges.getFeaturePrivileges(featureId);
  }

  public getBasePrivilege() {
    const entry = this.role.kibana[this.editingIndex];

    const basePrivileges = this.kibanaPrivileges.getBasePrivileges(entry);
    return basePrivileges.find(bp => entry.base.includes(bp.id));
  }

  public getDisplayedPrimaryFeaturePrivilege(featureId: string) {
    const feature = this.kibanaPrivileges.getSecuredFeature(featureId);

    const basePrivilege = this.getBasePrivilege();

    const selectedFeaturePrivileges = this.getSelectedFeaturePrivileges(featureId);

    return feature.primaryFeaturePrivileges.find(fp => {
      return (
        selectedFeaturePrivileges.includes(fp.id) ||
        selectedFeaturePrivileges.includes(`minimal_${fp.id}`) ||
        basePrivilege?.grantsPrivilege(fp).hasAllRequested
      );
    });
  }

  public hasNonSupersededSubFeaturePrivileges(featureId: string) {
    // We don't want the true effective primary here.
    // We want essentially the non-minimal version of whatever the primary happens to be.
    const displayedPrimary = this.getDisplayedPrimaryFeaturePrivilege(featureId);

    const formPrivileges = this.kibanaPrivileges.createCollectionFromRoleKibanaPrivileges([
      this.role.kibana[this.editingIndex],
    ]);

    const feature = this.kibanaPrivileges.getSecuredFeature(featureId);

    return feature.subFeaturePrivileges.some(
      sfp =>
        formPrivileges.grantsPrivilege(sfp).hasAllRequested &&
        !displayedPrimary?.grantsPrivilege(sfp).hasAllRequested
    );
  }

  public getEffectivePrimaryFeaturePrivilege(featureId: string) {
    const feature = this.kibanaPrivileges.getSecuredFeature(featureId);

    const basePrivilege = this.getBasePrivilege();

    const selectedFeaturePrivileges = this.getSelectedFeaturePrivileges(featureId);

    const allPrimaryFeaturePrivileges = [
      feature.primaryFeaturePrivileges,
      feature.minimalPrimaryFeaturePrivileges,
    ].flat();

    return allPrimaryFeaturePrivileges.find(fp => {
      return (
        selectedFeaturePrivileges.includes(fp.id) ||
        basePrivilege?.grantsPrivilege(fp).hasAllRequested
      );
    });
  }

  public isIndependentSubFeaturePrivilegeGranted(featureId: string, privilegeId: string) {
    const primaryFeaturePrivilege = this.getEffectivePrimaryFeaturePrivilege(featureId);
    if (!primaryFeaturePrivilege) {
      return false;
    }
    const selectedFeaturePrivileges = this.getSelectedFeaturePrivileges(featureId);

    const feature = this.kibanaPrivileges.getSecuredFeature(featureId);

    const subFeaturePrivilege = feature.allPrivileges.find(
      ap => ap instanceof SubFeaturePrivilege && ap.id === privilegeId
    ) as SubFeaturePrivilege;

    return Boolean(
      primaryFeaturePrivilege.grantsPrivilege(subFeaturePrivilege).hasAllRequested ||
        selectedFeaturePrivileges.includes(subFeaturePrivilege.id)
    );
  }

  public getSelectedMutuallyExclusiveSubFeaturePrivilege(
    featureId: string,
    subFeatureGroup: SubFeaturePrivilegeGroup
  ) {
    const primaryFeaturePrivilege = this.getEffectivePrimaryFeaturePrivilege(featureId);
    if (!primaryFeaturePrivilege) {
      return undefined;
    }

    const selectedFeaturePrivileges = this.getSelectedFeaturePrivileges(featureId);

    return subFeatureGroup.privileges.find(p => {
      return (
        primaryFeaturePrivilege.grantsPrivilege(p).hasAllRequested ||
        selectedFeaturePrivileges.includes(p.id)
      );
    });
  }

  public canCustomizeSubFeaturePrivileges(featureId: string) {
    const selectedFeaturePrivileges = this.getSelectedFeaturePrivileges(featureId);
    const feature = this.kibanaPrivileges.getSecuredFeature(featureId);

    const allPrimaryFeaturePrivs = [
      feature.primaryFeaturePrivileges,
      feature.minimalPrimaryFeaturePrivileges,
    ].flat();

    return allPrimaryFeaturePrivs.some(apfp => selectedFeaturePrivileges.includes(apfp.id));
  }

  public updateSelectedFeaturePrivilegesForCustomization(
    featureId: string,
    willBeCustomizing: boolean
  ) {
    const primary = this.getDisplayedPrimaryFeaturePrivilege(featureId);
    const selectedFeaturePrivileges = this.getSelectedFeaturePrivileges(featureId);

    if (!primary) {
      return selectedFeaturePrivileges;
    }

    const nextPrivileges = selectedFeaturePrivileges.filter(sfp => sfp !== primary.id);

    if (willBeCustomizing) {
      const feature = this.kibanaPrivileges.getSecuredFeature(featureId);

      const startingPrivileges = feature.allPrivileges
        .filter(
          ap => ap instanceof SubFeaturePrivilege && primary.grantsPrivilege(ap).hasAllRequested
        )
        .map(p => p.id);

      nextPrivileges.push(`minimal_${primary.id}`, ...startingPrivileges);
    } else {
      nextPrivileges.push(primary.id);
    }

    return nextPrivileges;
  }

  public hasSupersededInheritedPrivileges() {
    const global = this.locateGlobalPrivilege(this.role);

    const entry = this.role.kibana[this.editingIndex];

    if (isGlobalPrivilegeDefinition(entry) || !global) {
      return false;
    }

    const globalPrivileges = this.kibanaPrivileges.createCollectionFromRoleKibanaPrivileges([
      global,
    ]);

    const formPrivileges = this.kibanaPrivileges.createCollectionFromRoleKibanaPrivileges([
      this.role.kibana[this.editingIndex],
    ]);

    const basePrivileges = this.kibanaPrivileges.getBasePrivileges(entry);
    const featurePrivileges = this.kibanaPrivileges.getSecuredFeatures().map(f => f.allPrivileges);

    return [basePrivileges, featurePrivileges].flat(2).some(p => {
      const globalCheck = globalPrivileges.grantsPrivilege(p);
      const formCheck = formPrivileges.grantsPrivilege(p);
      const isSuperseded = globalCheck.hasAllRequested && !formCheck.hasAllRequested;
      return isSuperseded;
    });
  }

  private getSelectedFeaturePrivileges(featureId: string) {
    return this.role.kibana[this.editingIndex].feature[featureId] ?? [];
  }

  private locateGlobalPrivilege(role: Role) {
    return role.kibana.find(entry => isGlobalPrivilegeDefinition(entry));
  }
}
