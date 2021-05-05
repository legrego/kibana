/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SpacesOssPlugin } from './plugin';

describe('Spaces OSS plugin', () => {
  describe('#setup', () => {
    it('exposes expected contract', () => {
      const plugin = new SpacesOssPlugin();
      expect(plugin.setup()).toMatchInlineSnapshot(`
        Object {
          "setSpacesAvailable": [Function],
        }
      `);
    });
  });

  it('allows the Spaces feature to be marked as available', () => {
    const plugin = new SpacesOssPlugin();
    const { setSpacesAvailable } = plugin.setup();
    setSpacesAvailable(true);

    const { isSpacesAvailable } = plugin.start();
    expect(isSpacesAvailable).toEqual(true);
  });

  it('allows the Spaces feature to be marked as unavailable', () => {
    const plugin = new SpacesOssPlugin();
    const { setSpacesAvailable } = plugin.setup();
    setSpacesAvailable(false);

    const { isSpacesAvailable } = plugin.start();
    expect(isSpacesAvailable).toEqual(false);
  });

  it('marks the Spaces feature as unavailable by default', () => {
    const plugin = new SpacesOssPlugin();
    plugin.setup();

    const { isSpacesAvailable } = plugin.start();
    expect(isSpacesAvailable).toEqual(false);
  });
});
