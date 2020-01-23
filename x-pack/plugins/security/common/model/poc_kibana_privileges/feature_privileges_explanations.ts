/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { PrivilegeExplanation } from './privilege_explanation';
import { SubFeaturePrivilege } from '../sub_feature_privilege';

export class FeaturePrivilegesExplanations {
  constructor(
    protected readonly explanations: {
      [featureId: string]: { [privilegeId: string]: PrivilegeExplanation };
    }
  ) {}

  public static compose(entities: FeaturePrivilegesExplanations[]) {
    const allExplanations = entities.reduce(
      (acc, ex) => {
        return {
          ...acc,
          ...ex.explanations,
        };
      },
      {} as {
        [featureId: string]: { [privilegeId: string]: PrivilegeExplanation };
      }
    );

    return new FeaturePrivilegesExplanations(allExplanations);
  }

  public exists(
    predicate: (
      featureId: string,
      privilegeId: string,
      explanation: PrivilegeExplanation
    ) => boolean
  ) {
    for (const entry of this.explanationsIterator()) {
      if (predicate(entry.featureId, entry.privilegeId, entry.explanation)) {
        return true;
      }
    }
    return false;
  }

  public isGranted(featureId: string, privilegeId: string) {
    return this.explanations[featureId][privilegeId].isGranted();
  }

  public isInherited(featureId: string, privilegeId: string) {
    return this.explanations[featureId][privilegeId].isInherited();
  }

  public isInheritedByGlobal(featureId: string, privilegeId: string) {
    const explanation = this.explanations[featureId][privilegeId];
    const { global } = explanation.getGrantSources();
    return global.filter(gp => !gp.equals(explanation.privilege)).length > 0;
  }

  public hasNonSupersededCustomizations() {
    return this.exists(
      (featureId, privilegeId, explanation) =>
        explanation.privilege.privilege.type === 'feature' &&
        explanation.isDirectlyAssigned() &&
        !explanation.isInherited()
    );
  }

  public hasNonSupersededSubFeatureCustomizations() {
    return this.exists(
      (featureId, privilegeId, explanation) =>
        explanation.privilege.privilege instanceof SubFeaturePrivilege &&
        explanation.isDirectlyAssigned() &&
        !explanation.isInherited()
    );
  }

  public *explanationsIterator(): IterableIterator<{
    featureId: string;
    privilegeId: string;
    explanation: PrivilegeExplanation;
  }> {
    for (const [featureId, privilegeExplanations] of Object.entries(this.explanations)) {
      for (const [privilegeId, explanation] of Object.entries(privilegeExplanations)) {
        yield { featureId, privilegeId, explanation };
      }
    }
  }
}
