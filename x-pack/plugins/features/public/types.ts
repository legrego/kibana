/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Feature, FeatureKibanaPrivileges } from '../server';

export interface FeatureViewModel extends Omit<Feature, 'privileges'> {
  privileges: {
    required: FeatureKibanaPrivileges[];
    optional: Array<{
      name: string;
      privileges: FeatureKibanaPrivileges[];
    }>;
  };
}
