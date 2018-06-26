/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { defaultsDeep } from 'lodash';
import { getRootPropertiesObjects } from '../../../../mappings';

/**
 * Gets the types based on the type. Uses mappings to support
 * null type (all types), a single type string or an array
 * @param {EsMapping} mappings
 * @param {(string|Array<string>)} type
 */
function getTypes(mappings, type) {
  if (!type) {
    return Object.keys(getRootPropertiesObjects(mappings));
  }

  if (Array.isArray(type)) {
    return type;
  }

  return [type];
}

/**
 *  Get the field params based on the types and searchFields
 *  @param  {Array<string>} searchFields
 *  @param  {string|Array<string>} types
 *  @return {Object}
 */
function getFieldsForTypes(searchFields, types) {

  if (!searchFields || !searchFields.length) {
    return {
      all_fields: true
    };
  }

  return {
    fields: searchFields.reduce((acc, field) => [
      ...acc,
      ...types.map(prefix => `${prefix}.${field}`)
    ], []),
  };
}

/**
 *  Get the "query" related keys for the search body
 *  @param  {EsMapping} mapping mappings from Ui
 *  @param  {(string|Array<string>)} type
 *  @param  {String} search
 *  @param  {Array<string>} searchFields
 *  @param {Object} extraQueryParams query parameters to merge into the result
 *  @return {Object}
 */
export function getQueryParams(mappings, type, search, searchFields, extraQueryParams = {}) {
  if (!type && !search) {
    return {};
  }

  const bool = {};

  if (type) {
    bool.filter = [{ [Array.isArray(type) ? 'terms' : 'term']: { type } }];
  }

  if (search) {
    bool.must = [
      ...bool.must || [],
      {
        simple_query_string: {
          query: search,
          ...getFieldsForTypes(
            searchFields,
            getTypes(mappings, type)
          )
        }
      }
    ];
  }

  // a list of fields to manually merge together
  const fieldsToMerge = ['filter', 'must'];

  const extraParams = {
    ...extraQueryParams.bool
  };

  // Remove the manual merge fields from the collection of properties we will automatically combine.
  fieldsToMerge.forEach(field => delete extraParams[field]);

  let query = {
    bool: defaultsDeep(bool, extraParams)
  };

  if (extraQueryParams.bool) {

    const extraBoolParams = extraQueryParams.bool;

    query = fieldsToMerge.reduce((queryAcc, field) => {
      const prop = queryAcc.bool[field];
      const extraProp = extraBoolParams[field];
      if (Array.isArray(prop) && Array.isArray(extraProp)) {
        queryAcc.bool[field] = [...prop, ...extraProp];
      }
      return queryAcc;
    }, query);
  }

  return { query };
}


