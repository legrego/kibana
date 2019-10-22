/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { merge, cloneDeep } from 'lodash';
import { FeatureKibanaPrivileges } from '.';

export class FeaturePrivilege {
  private readonly definition: FeatureKibanaPrivileges;

  constructor(def: FeatureKibanaPrivileges, ...featurePrivileges: FeaturePrivilege[]) {
    this.definition = featurePrivileges.reduce((acc, privilege) => {
      const { management, catalogue, api, app, savedObject, ui } = privilege.get();
      if (def.id === 'all') console.log({ acc });
      // TODO: Management
      const res = {
        ...acc,
        catalogue: [...(acc.catalogue || []), ...(catalogue || [])],
        api: [...(acc.api || []), ...(api || [])],
        app: [...(acc.app || []), ...(app || [])],
        savedObject: {
          all: [...acc.savedObject.all, ...savedObject.all],
          read: [...acc.savedObject.read, ...savedObject.read],
        },
        ui: [...acc.ui, ...ui],
      };

      if (!def.catalogue && res.catalogue.length === 0) delete res.catalogue;
      if (!def.app && res.app.length === 0) delete res.app;
      if (!def.api && res.api.length === 0) delete res.api;

      if (def.id === 'all') console.log({ acc, res });
      return res;
    }, def);

    console.log(def, this.definition);
  }

  public get() {
    return cloneDeep<Readonly<FeatureKibanaPrivileges>>(this.definition);
  }

  public toJSON() {
    return JSON.stringify(this.definition);
  }
}
