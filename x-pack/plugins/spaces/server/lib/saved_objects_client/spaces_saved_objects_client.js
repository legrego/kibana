/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export class SpacesSavedObjectsClient {
  constructor(options) {
    const {
      request,
      baseClient,
      spaceUrlContext,
    } = options;

    this.errors = baseClient.errors;

    this._client = baseClient;
    this._request = request;

    this._spaceUrlContext = spaceUrlContext;
  }

  async create(type, attributes = {}, options = {}) {

    if (this._isTypeSpaceAware(type)) {
      options.extraBodyProperties = {
        ...options.extraBodyProperties,
        spaceId: await this._getSpaceId()
      };
    }

    return await this._client.create(type, attributes, options);
  }

  async bulkCreate(objects, options = {}) {
    options.extraBodyProperties = {
      ...options.extraBodyProperties,
      spaceId: await this._getSpaceId()
    };

    return await this._client.bulkCreate(objects, options);
  }

  async delete(type, id) {
    return await this._client.delete(type, id);
  }

  async find(options = {}) {
    const spaceOptions = {};

    if (this._isTypeSpaceAware(options.type)) {
      const spaceId = await this._getSpaceId();
      if (spaceId) {
        spaceOptions.extraFilters = [{
          term: {
            spaceId
          }
        }];
      }
    }

    return await this._client.find({ ...options, ...spaceOptions });
  }

  async bulkGet(objects = []) {
    // ES 'mget' does not support queries, so we have to filter results after the fact.
    const thisSpaceId = await this._getSpaceId();

    const result = await this._client.bulkGet(objects, {
      extraSourceProperties: ['spaceId', 'type']
    });

    result.saved_objects = result.saved_objects.filter(savedObject => {
      const { type, spaceId } = savedObject.attributes;

      if (this._isTypeSpaceAware(type)) {
        return spaceId === thisSpaceId;
      }
      return true;
    });

    return result;
  }

  async get(type, id) {
    // ES 'get' does not support queries, so we have to filter results after the fact.
    let thisSpaceId;

    if (this._isTypeSpaceAware(type)) {
      thisSpaceId = await this._getSpaceId();
    }

    const response = await this._client.get(type, id, {
      extraSourceProperties: ['spaceId']
    });

    const { spaceId: objectSpaceId } = response.attributes;

    if (objectSpaceId !== thisSpaceId) {
      throw this._client.errors.createGenericNotFoundError();
    }

    return response;
  }

  async update(type, id, attributes, options = {}) {
    attributes.spaceId = await this._getSpaceId();
    return await this._client.update(type, id, attributes, options);
  }

  _isTypeSpaceAware(type) {
    return type !== 'space';
  }

  async _getSpaceId() {
    if (!this._spaceId) {
      const {
        saved_objects: spaces = []
      } =  await this.find({
        type: 'space',
        search: `"${this._spaceUrlContext}"`,
        search_fields: ['urlContext'],
      });

      if (spaces.length > 0) {
        this._spaceId = spaces[0].id;
      }
    }

    return this._spaceId;
  }
}
