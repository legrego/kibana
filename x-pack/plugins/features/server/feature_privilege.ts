/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { merge, cloneDeep } from 'lodash';
import { FeatureKibanaPrivileges } from '.';

export class FeaturePrivilege {
  private readonly definition: FeatureKibanaPrivileges;

  constructor(definition: FeatureKibanaPrivileges, ...featurePrivileges: FeaturePrivilege[]) {
    this.definition = featurePrivileges.reduce((acc, privilege) => {
      const { management, catalogue, api, app, savedObject, ui } = privilege.get();
      return merge(acc, {
        management,
        catalogue,
        api,
        app,
        savedObject,
        ui,
      });
    }, definition);
  }

  public get() {
    return cloneDeep<Readonly<FeatureKibanaPrivileges>>(this.definition);
  }

  public toJSON() {
    return JSON.stringify(this.definition);
  }
}
