/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, uniq } from 'lodash';

export class SecureSavedObjectsClientWrapper {
  constructor(options) {
    const {
      actions,
      auditLogger,
      baseClient,
      checkPrivilegesWithRequest,
      errors,
      request,
      savedObjectTypes,
      spaces,
    } = options;

    this.errors = errors;
    this._actions = actions;
    this._auditLogger = auditLogger;
    this._baseClient = baseClient;
    this._checkPrivileges = checkPrivilegesWithRequest(request);
    this._request = request;
    this._savedObjectTypes = savedObjectTypes;
    this._spaces = spaces;
  }

  async create(type, attributes = {}, options = {}) {
    await this._ensureAuthorized(
      type,
      'create',
      { type, attributes, options },
    );

    return await this._baseClient.create(type, attributes, options);
  }

  async bulkCreate(objects, options = {}) {
    const types = uniq(objects.map(o => o.type));
    await this._ensureAuthorized(
      types,
      'bulk_create',
      { objects, options },
    );

    return await this._baseClient.bulkCreate(objects, options);
  }

  async delete(type, id) {
    await this._ensureAuthorized(
      type,
      'delete',
      { type, id },
    );

    return await this._baseClient.delete(type, id);
  }

  async find(options = {}) {
    if (options.type) {
      return await this._findWithTypes(options);
    }

    return await this._findAcrossAllTypes(options);
  }

  async bulkGet(objects = [], options = {}) {
    const types = uniq(objects.map(o => o.type));
    await this._ensureAuthorized(
      types,
      'bulk_get',
      { objects, options },
    );

    return await this._baseClient.bulkGet(objects, options);
  }

  async get(type, id, options = {}) {
    await this._ensureAuthorized(
      type,
      'get',
      { type, id, options },
    );

    return await this._baseClient.get(type, id, options);
  }

  async update(type, id, attributes, options = {}) {
    await this._ensureAuthorized(
      type,
      'update',
      { type, id, attributes, options },
    );

    return await this._baseClient.update(type, id, attributes, options);
  }

  async _checkSavedObjectPrivileges(actions) {
    try {
      if (!this._spaces) {
        const spaceId = this._spaces.getSpaceId(this._request);
        return await this._checkPrivileges.atSpace(spaceId, actions);
      }
      else {
        return await this._checkPrivileges.globally(actions);
      }
    } catch(error) {
      const { reason } = get(error, 'body.error', {});
      throw this.errors.decorateGeneralError(error, reason);
    }
  }

  async _ensureAuthorized(typeOrTypes, action, args) {
    const types = Array.isArray(typeOrTypes) ? typeOrTypes : [typeOrTypes];
    const actions = types.map(type => this._actions.getSavedObjectAction(type, action));
    const { hasAllRequested, username, privileges } = await this._checkSavedObjectPrivileges(actions);

    if (hasAllRequested) {
      this._auditLogger.savedObjectsAuthorizationSuccess(username, action, types, args);
    } else {
      const missing = this._getMissingPrivileges(privileges);
      this._auditLogger.savedObjectsAuthorizationFailure(
        username,
        action,
        types,
        missing,
        args
      );
      const msg = `Unable to ${action} ${[...types].sort().join(',')}, missing ${[...missing].sort().join(',')}`;
      throw this.errors.decorateForbiddenError(new Error(msg));
    }
  }

  async _findAcrossAllTypes(options) {
    const action = 'find';

    // we have to filter for only their authorized types
    const types = this._savedObjectTypes;
    const typesToPrivilegesMap = new Map(types.map(type => [type, this._actions.getSavedObjectAction(type, action)]));
    const { username, privileges } = await this._checkSavedObjectPrivileges(Array.from(typesToPrivilegesMap.values()));

    const authorizedTypes = Array.from(typesToPrivilegesMap.entries())
      .filter(([, privilege]) => privileges[privilege])
      .map(([type]) => type);

    if (authorizedTypes.length === 0) {
      this._auditLogger.savedObjectsAuthorizationFailure(
        username,
        action,
        types,
        this._getMissingPrivileges(privileges),
        { options }
      );
      throw this.errors.decorateForbiddenError(new Error(`Not authorized to find saved_object`));
    }

    this._auditLogger.savedObjectsAuthorizationSuccess(username, action, authorizedTypes, { options });

    return await this._baseClient.find({
      ...options,
      type: authorizedTypes
    });
  }

  async _findWithTypes(options) {
    await this._ensureAuthorized(
      options.type,
      'find',
      { options },
    );

    return await this._baseClient.find(options);
  }

  _getMissingPrivileges(response) {
    return Object.keys(response).filter(privilege => !response[privilege]);
  }
}
