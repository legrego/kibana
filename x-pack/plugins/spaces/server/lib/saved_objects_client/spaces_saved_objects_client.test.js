/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SpacesSavedObjectsClient } from './spaces_saved_objects_client';
import { createSpacesService } from '../create_spaces_service';

jest.mock('uuid', () => ({
  v1: jest.fn(() => `mock-id`)
}));

const createObjectEntry = (type, id, spaceId) => ({
  [id]: {
    id,
    type,
    spaceId
  }
});

const SAVED_OBJECTS = {
  ...createObjectEntry('foo', 'object_0'),
  ...createObjectEntry('foo', 'space_1:object_1', 'space_1'),
  ...createObjectEntry('foo', 'space_2:object_2', 'space_2'),
};

const createMockRequest = (space) => ({
  getBasePath: () => space.urlContext ? `/s/${space.urlContext}` : '',
});

const createMockClient = (space) => {
  return {
    get: jest.fn((type, id) => {
      const object = SAVED_OBJECTS[id];
      if (!object) {
        throw new Error(`object not found: ${id}`);
      }
      return object;
    }),
    bulkGet: jest.fn((objects) => {
      return {
        saved_objects: objects.map(o => SAVED_OBJECTS[o.id] || {
          id: o.id,
          type: o.type,
          error: {
            statusCode: 404,
            message: 'Not found'
          }
        })
      };
    }),
    find: jest.fn(({ type }) => {
      // used to locate spaces when type is `space` within these tests
      if (type === 'space') {
        return {
          saved_objects: [space]
        };
      }
      throw new Error(`not implemented`);
    }),
    create: jest.fn((type, attributes, options) => ({
      id: options.id || 'some-new-id',
      type,
      attributes
    })),
    bulkCreate: jest.fn(((objects) => objects.map((o, i) => ({
      ...o,
      id: o.id || `abc-${i}`
    })))),
    update: jest.fn((type, id, attributes) => ({
      id,
      type,
      attributes
    })),
    delete: jest.fn(),
    errors: {
      createGenericNotFoundError: jest.fn(() => {
        return new Error('not found');
      })
    }
  };
};
describe('within the default space', () => {
  describe('#get', () => {
    test(`returns the object when it belongs to the default space`, async () => {
      const currentSpace = {
        id: 'default',
        urlContext: ''
      };

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService();

      const client = new SpacesSavedObjectsClient({
        request,
        baseClient,
        spacesService,
        types: [],
      });

      const type = 'foo';
      const id = 'object_0';

      const result = await client.get(type, id);

      expect(result).toBe(SAVED_OBJECTS[id]);
    });

    test(`returns error when the object belongs to a different space`, async () => {
      const currentSpace = {
        id: 'default',
        urlContext: ''
      };

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService();

      const client = new SpacesSavedObjectsClient({
        request,
        baseClient,
        spacesService,
        types: [],
      });

      const type = 'foo';
      const id = 'object_2';

      await expect(client.get(type, id)).rejects.toThrowErrorMatchingSnapshot();
    });
  });

  describe('#bulk_get', () => {
    test(`only returns objects belonging to the default space`, async () => {
      const currentSpace = {
        id: 'default',
        urlContext: ''
      };

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService();

      const client = new SpacesSavedObjectsClient({
        request,
        baseClient,
        spacesService,
        types: [],
      });

      const type = 'foo';

      const result = await client.bulkGet([{
        type,
        id: 'object_0'
      }, {
        type,
        id: 'object_2'
      }]);

      expect(result).toEqual({
        saved_objects: [{
          id: 'object_0',
          type: 'foo',
        }, {
          id: 'object_2',
          type: 'foo',
          error: {
            message: 'Not found',
            statusCode: 404
          }
        }]
      });
    });
  });

  describe('#create', () => {
    test('automatically assigns the object to the default space by not using extraBodyProperties', async () => {
      const currentSpace = {
        id: 'default',
        urlContext: ''
      };

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService();

      const client = new SpacesSavedObjectsClient({
        request,
        baseClient,
        spacesService,
        types: [],
      });

      const type = 'foo';
      const attributes = {
        prop1: 'value 1',
        prop2: 'value 2'
      };

      await client.create(type, attributes);

      expect(baseClient.create).toHaveBeenCalledWith(type, attributes, {});
    });

    test('does not assign a space-unaware object to a space', async () => {
      const currentSpace = {
        id: 'default',
        urlContext: ''
      };

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService();

      const client = new SpacesSavedObjectsClient({
        request,
        baseClient,
        spacesService,
        types: [],
      });

      const type = 'space';
      const attributes = {
        prop1: 'value 1',
        prop2: 'value 2'
      };

      await client.create(type, attributes);

      expect(baseClient.create).toHaveBeenCalledWith(type, attributes, {});
    });
  });

  describe('#bulk_create', () => {
    test('allows for bulk creation when all types are space-aware', async () => {
      const currentSpace = {
        id: 'default',
        urlContext: ''
      };

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService();

      const client = new SpacesSavedObjectsClient({
        request,
        baseClient,
        spacesService,
        types: [],
      });


      const attributes = {
        prop1: 'value 1',
        prop2: 'value 2'
      };
      const objects = [{
        type: 'foo',
        attributes
      }, {
        type: 'bar',
        attributes
      }];

      await client.bulkCreate(objects);

      expect(baseClient.bulkCreate).toHaveBeenCalledWith(objects, {});
    });

    test('allows for bulk creation when all types are not space-aware', async () => {
      const currentSpace = {
        id: 'default',
        urlContext: ''
      };

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService();

      const client = new SpacesSavedObjectsClient({
        request,
        baseClient,
        spacesService,
        types: [],
      });

      const attributes = {
        prop1: 'value 1',
        prop2: 'value 2'
      };

      const objects = [{
        type: 'space',
        attributes
      }, {
        type: 'space',
        attributes
      }];

      await client.bulkCreate(objects);

      expect(baseClient.bulkCreate).toHaveBeenCalledWith(objects, {});
    });

    test('allows space-aware and non-space-aware objects to be created at the same time', async () => {
      const currentSpace = {
        id: 'default',
        urlContext: ''
      };

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService();

      const client = new SpacesSavedObjectsClient({
        request,
        baseClient,
        spacesService,
        types: [],
      });

      const attributes = {
        prop1: 'value 1',
        prop2: 'value 2'
      };

      const objects = [{
        type: 'space',
        attributes
      }, {
        type: 'foo',
        attributes
      }];

      await client.bulkCreate(objects);

      expect(baseClient.bulkCreate).toHaveBeenCalledWith(objects, {});
    });
  });

  describe('#update', () => {
    test('allows an object to be updated if it exists in the same space', async () => {
      const currentSpace = {
        id: 'default',
        urlContext: ''
      };

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService();

      const client = new SpacesSavedObjectsClient({
        request,
        baseClient,
        spacesService,
        types: [],
      });

      const id = 'object_0';
      const type = 'foo';
      const attributes = {
        prop1: 'value 1',
        prop2: 'value 2'
      };

      await client.update(type, id, attributes);

      expect(baseClient.update).toHaveBeenCalledWith(type, id, attributes, {});
    });

    test('does not allow an object to be updated via a different space', async () => {
      const currentSpace = {
        id: 'default',
        urlContext: ''
      };

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService();

      const client = new SpacesSavedObjectsClient({
        request,
        baseClient,
        spacesService,
        types: [],
      });

      const id = 'object_2';
      const type = 'foo';
      const attributes = {
        prop1: 'value 1',
        prop2: 'value 2'
      };

      await expect(client.update(type, id, attributes)).rejects.toThrowErrorMatchingSnapshot();
    });
  });

  describe('#delete', () => {
    test('allows an object to be deleted if it exists in the same space', async () => {
      const currentSpace = {
        id: 'default',
        urlContext: ''
      };

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService();

      const client = new SpacesSavedObjectsClient({
        request,
        baseClient,
        spacesService,
        types: [],
      });

      const id = 'object_0';
      const type = 'foo';

      await client.delete(type, id);

      expect(baseClient.delete).toHaveBeenCalledWith(type, id);
    });

    test('does not allow an object to be deleted via a different space', async () => {
      const currentSpace = {
        id: 'default',
        urlContext: ''
      };

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService();

      const client = new SpacesSavedObjectsClient({
        request,
        baseClient,
        spacesService,
        types: [],
      });

      const id = 'object_2';
      const type = 'foo';

      await expect(client.delete(type, id)).rejects.toThrowErrorMatchingSnapshot();
    });
  });
});

describe('within a space', () => {
  describe('#get', () => {
    test(`returns the object when it belongs to the current space`, async () => {
      const currentSpace = {
        id: 'space_1',
        urlContext: 'space-1'
      };

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService();

      const client = new SpacesSavedObjectsClient({
        request,
        baseClient,
        spacesService,
        types: [],
      });

      const type = 'foo';
      const id = 'object_1';

      const result = await client.get(type, id);

      expect(result).toBe(SAVED_OBJECTS['space_1:' + id]);
    });

    test(`returns error when the object belongs to a different space`, async () => {
      const currentSpace = {
        id: 'space_1',
        urlContext: 'space-1'
      };

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService();

      const client = new SpacesSavedObjectsClient({
        request,
        baseClient,
        spacesService,
        types: [],
      });

      const type = 'foo';
      const id = 'object_2';

      await expect(client.get(type, id)).rejects.toThrowErrorMatchingSnapshot();
    });
  });

  describe('#bulk_get', () => {
    test(`only returns objects belonging to the current space`, async () => {
      const currentSpace = {
        id: 'space_1',
        urlContext: 'space-1'
      };

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService();

      const client = new SpacesSavedObjectsClient({
        request,
        baseClient,
        spacesService,
        types: [],
      });

      const type = 'foo';

      const result = await client.bulkGet([{
        type,
        id: 'object_1'
      }, {
        type,
        id: 'object_2'
      }]);

      expect(result).toEqual({
        saved_objects: [{
          id: 'object_1',
          spaceId: 'space_1',
          type: 'foo',
        }, {
          id: 'object_2',
          type: 'foo',
          error: {
            message: 'Not found',
            statusCode: 404
          }
        }]
      });
    });
  });

  describe('#create', () => {
    test('automatically assigns the object to the current space via extraBodyProperties', async () => {
      const currentSpace = {
        id: 'space_1',
        urlContext: 'space-1'
      };

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService();

      const client = new SpacesSavedObjectsClient({
        request,
        baseClient,
        spacesService,
        types: [],
      });

      const type = 'foo';
      const attributes = {
        prop1: 'value 1',
        prop2: 'value 2'
      };

      await client.create(type, attributes);

      expect(baseClient.create).toHaveBeenCalledWith(type, attributes, {
        id: 'space_1:mock-id',
        extraBodyProperties: {
          spaceId: 'space_1'
        }
      });
    });

    test('does not assign a space-unaware object to a space', async () => {
      const currentSpace = {
        id: 'space_1',
        urlContext: 'space-1'
      };

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService();

      const client = new SpacesSavedObjectsClient({
        request,
        baseClient,
        spacesService,
        types: [],
      });

      const type = 'space';
      const attributes = {
        prop1: 'value 1',
        prop2: 'value 2'
      };

      await client.create(type, attributes);

      expect(baseClient.create).toHaveBeenCalledWith(type, attributes, {});
    });
  });

  describe('#bulk_create', () => {
    test('allows for bulk creation when all types are space-aware', async () => {
      const currentSpace = {
        id: 'space_1',
        urlContext: 'space-1'
      };

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService();

      const client = new SpacesSavedObjectsClient({
        request,
        baseClient,
        spacesService,
        types: [],
      });


      const attributes = {
        prop1: 'value 1',
        prop2: 'value 2'
      };
      const objects = [{
        type: 'foo',
        attributes
      }, {
        type: 'bar',
        attributes
      }];

      await client.bulkCreate(objects);

      const expectedCalledWithObjects = objects.map(o => ({
        ...o,
        id: `space_1:mock-id`,
        extraBodyProperties: {
          spaceId: 'space_1'
        }
      }));

      expect(baseClient.bulkCreate).toHaveBeenCalledWith(expectedCalledWithObjects, {});
    });

    test('allows for bulk creation when all types are not space-aware', async () => {
      const currentSpace = {
        id: 'space_1',
        urlContext: 'space-1'
      };

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService();

      const client = new SpacesSavedObjectsClient({
        request,
        baseClient,
        spacesService,
        types: [],
      });

      const attributes = {
        prop1: 'value 1',
        prop2: 'value 2'
      };

      const objects = [{
        type: 'space',
        attributes
      }, {
        type: 'space',
        attributes
      }];

      await client.bulkCreate(objects);

      expect(baseClient.bulkCreate).toHaveBeenCalledWith(objects, {});
    });

    test('allows space-aware and non-space-aware objects to be created at the same time', async () => {
      const currentSpace = {
        id: 'space_1',
        urlContext: 'space-1'
      };

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService();

      const client = new SpacesSavedObjectsClient({
        request,
        baseClient,
        spacesService,
        types: [],
      });

      const attributes = {
        prop1: 'value 1',
        prop2: 'value 2'
      };

      const objects = [{
        type: 'space',
        attributes
      }, {
        type: 'foo',
        attributes
      }];

      await client.bulkCreate(objects);

      const expectedCalledWithObjects = [...objects];
      expectedCalledWithObjects[1] = {
        ...expectedCalledWithObjects[1],
        id: `space_1:mock-id`,
        extraBodyProperties: {
          spaceId: 'space_1'
        }
      };

      expect(baseClient.bulkCreate).toHaveBeenCalledWith(expectedCalledWithObjects, {});
    });
  });

  describe('#update', () => {
    test('allows an object to be updated if it exists in the same space', async () => {
      const currentSpace = {
        id: 'space_1',
        urlContext: 'space-1'
      };

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService();

      const client = new SpacesSavedObjectsClient({
        request,
        baseClient,
        spacesService,
        types: [],
      });

      const id = 'object_1';
      const type = 'foo';
      const attributes = {
        prop1: 'value 1',
        prop2: 'value 2'
      };

      await client.update(type, id, attributes);

      expect(baseClient.update).toHaveBeenCalledWith(type, `space_1:${id}`, attributes, { extraBodyProperties: { spaceId: 'space_1' } });
    });

    test('does not allow an object to be updated via a different space', async () => {
      const currentSpace = {
        id: 'space_1',
        urlContext: 'space-1'
      };

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService();

      const client = new SpacesSavedObjectsClient({
        request,
        baseClient,
        spacesService,
        types: [],
      });

      const id = 'object_2';
      const type = 'foo';
      const attributes = {
        prop1: 'value 1',
        prop2: 'value 2'
      };

      await expect(client.update(type, id, attributes)).rejects.toThrowErrorMatchingSnapshot();
    });
  });

  describe('#delete', () => {
    test('allows an object to be deleted if it exists in the same space', async () => {
      const currentSpace = {
        id: 'space_1',
        urlContext: 'space-1'
      };

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService();

      const client = new SpacesSavedObjectsClient({
        request,
        baseClient,
        spacesService,
        types: [],
      });

      const id = 'object_1';
      const type = 'foo';

      await client.delete(type, id);

      expect(baseClient.delete).toHaveBeenCalledWith(type, `space_1:${id}`);
    });

    test('does not allow an object to be deleted via a different space', async () => {
      const currentSpace = {
        id: 'space_1',
        urlContext: 'space-1'
      };

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService();

      const client = new SpacesSavedObjectsClient({
        request,
        baseClient,
        spacesService,
        types: [],
      });

      const id = 'object_2';
      const type = 'foo';

      await expect(client.delete(type, id)).rejects.toThrowErrorMatchingSnapshot();
    });
  });
});

