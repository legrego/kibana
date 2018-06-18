/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow, mount } from 'enzyme';
import { CollapsiblePanel } from './collapsible_panel';
import { EuiLink } from '@elastic/eui';

test('it renders without blowing up', () => {
  const wrapper = shallow(
    <CollapsiblePanel
      iconType="logoElasticsearch"
      title="Elasticsearch"
    >
      <p>child</p>
    </CollapsiblePanel>
  );

  expect(wrapper).toMatchSnapshot();
});

test('it renders children by default', () => {
  const wrapper = mount(
    <CollapsiblePanel
      iconType="logoElasticsearch"
      title="Elasticsearch"
    >
      <p className="child">child 1</p>
      <p className="child">child 2</p>
    </CollapsiblePanel>
  );

  expect(wrapper.find(CollapsiblePanel)).toHaveLength(1);
  expect(wrapper.find('.child')).toHaveLength(2);
});

test('it hides children when the "hide" link is clicked', () => {
  const wrapper = mount(
    <CollapsiblePanel
      iconType="logoElasticsearch"
      title="Elasticsearch"
    >
      <p className="child">child 1</p>
      <p className="child">child 2</p>
    </CollapsiblePanel>
  );

  expect(wrapper.find(CollapsiblePanel)).toHaveLength(1);
  expect(wrapper.find('.child')).toHaveLength(2);

  wrapper.find(EuiLink).simulate('click');

  expect(wrapper.find('.child')).toHaveLength(0);
});
