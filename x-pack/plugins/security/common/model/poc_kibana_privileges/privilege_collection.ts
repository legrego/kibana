/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Privilege } from './privilege_instance';

export class PrivilegeCollection {
  private actions: string[];

  constructor(private readonly privileges: Privilege[]) {
    this.actions = privileges.reduce((acc, priv) => [...acc, ...priv.actions], [] as string[]);
  }

  public grantsPrivilege(privilege: Privilege) {
    return this.checkActions(this.actions, privilege.actions);
  }

  public getPrivilegesGranting(privilege: Privilege) {
    return this.privileges.filter(p => p.grantsActions(privilege.actions).hasAllRequested);
  }

  public without(...privileges: Array<Pick<Privilege, 'type' | 'id'>>) {
    return new PrivilegeCollection(
      this.privileges.filter(
        p =>
          !privileges.find(
            withoutPrivilege => p.type === withoutPrivilege.type && p.id === withoutPrivilege.id
          )
      )
    );
  }

  private checkActions(knownActions: string[], candidateActions: string[]) {
    const missing = candidateActions.filter(action => !knownActions.includes(action));

    const hasAllRequested = missing.length === 0;

    return {
      missing,
      hasAllRequested,
    };
  }
}
