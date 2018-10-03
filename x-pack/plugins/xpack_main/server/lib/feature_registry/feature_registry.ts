/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { Feature } from 'x-pack/common/feature';

const features: Record<string, Feature> = {};

export function registerFeature(feature: Feature) {
  if (feature.id in features) {
    throw new Error(`Feature with id ${feature.id} is already registered.`);
  }

  features[feature.id] = feature;
}

export function unregisterFeature(feature: Feature) {
  delete features[feature.id];
}

export function getFeatures(): Feature[] {
  return _.cloneDeep(Object.values(features));
}
