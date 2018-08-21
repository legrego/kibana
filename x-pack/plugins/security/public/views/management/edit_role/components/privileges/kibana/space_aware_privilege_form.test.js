/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow, mount } from 'enzyme';
import { SpaceAwarePrivilegeForm } from './space_aware_privilege_form';
import { PrivilegeCalloutWarning } from './privilege_callout_warning';
import { PrivilegeSpaceTable } from './privilege_space_table';
import { PrivilegeSpaceForm } from './privilege_space_form';

const buildProps = (customProps) => {
  return {
    role: {
      elasticsearch: {
        cluster: ['manage']
      },
      kibana: {
        global: [],
        space: {}
      }
    },
    spaces: [{
      id: 'default',
      name: 'Default Space',
      _reserved: true
    }, {
      id: 'marketing',
      name: 'Marketing'
    }],
    editable: true,
    kibanaAppPrivileges: [{
      name: 'all'
    }, {
      name: 'read'
    }],
    onChange: jest.fn(),
    ...customProps
  };
};

describe('<SpaceAwarePrivilegeForm>', () => {
  it('renders without crashing', () => {
    expect(shallow(<SpaceAwarePrivilegeForm {...buildProps()} />)).toMatchSnapshot();
  });

  it('shows the space table if exisitng space privileges are declared', () => {
    const props = buildProps({
      role: {
        elasticsearch: {
          cluster: ['manage']
        },
        kibana: {
          global: ["read"],
          space: {
            default: ["all"]
          }
        }
      },
    });

    const wrapper = mount(<SpaceAwarePrivilegeForm {...props} />);

    const table = wrapper.find(PrivilegeSpaceTable);
    expect(table).toHaveLength(1);
  });

  it('hides the space table if there are no existing space privileges', () => {
    const props = buildProps();

    const wrapper = mount(<SpaceAwarePrivilegeForm {...props} />);

    const table = wrapper.find(PrivilegeSpaceTable);
    expect(table).toMatchSnapshot();
  });

  it('adds a form row when clicking the "Add Space Privilege" button', () => {
    const props = buildProps({
      role: {
        elasticsearch: {
          cluster: ['manage']
        },
        kibana: {
          global: ["read"],
          space: {
            default: ["all"]
          }
        }
      },
    });

    const wrapper = mount(<SpaceAwarePrivilegeForm {...props} />);
    expect(wrapper.find(PrivilegeSpaceForm)).toHaveLength(0);

    wrapper.find('button[data-test-subj="addSpacePrivilegeButton"]').simulate('click');

    expect(wrapper.find(PrivilegeSpaceForm)).toHaveLength(1);
  });

  describe('with minimum privilege set to "all"', () => {
    it('does not allow space privileges to be customized', () => {
      const props = buildProps({
        role: {
          elasticsearch: {
            cluster: ['manage']
          },
          kibana: {
            global: ["all"],
            space: {
              default: ["all"]
            }
          }
        },
      });

      const wrapper = mount(<SpaceAwarePrivilegeForm {...props} />);

      const warning = wrapper.find(PrivilegeCalloutWarning);
      expect(warning.props()).toMatchObject({
        basePrivilege: 'all'
      });

      const table = wrapper.find(PrivilegeSpaceTable);
      expect(table).toHaveLength(0);

      const addPrivilegeButton = wrapper.find('[data-test-subj="addSpacePrivilegeButton"]');
      expect(addPrivilegeButton).toHaveLength(0);
    });
  });

  describe('with minimum privilege set to "read"', () => {
    it('shows a warning about minimum privilege', () => {
      const props = buildProps({
        role: {
          elasticsearch: {
            cluster: ['manage']
          },
          kibana: {
            global: ["read"],
            space: {
              default: ["all"]
            }
          }
        },
      });

      const wrapper = mount(<SpaceAwarePrivilegeForm {...props} />);

      const warning = wrapper.find(PrivilegeCalloutWarning);
      expect(warning.props()).toMatchObject({
        basePrivilege: 'read'
      });
    });

    it('allows space privileges to be customized', () => {
      const props = buildProps({
        role: {
          elasticsearch: {
            cluster: ['manage']
          },
          kibana: {
            global: ["read"],
            space: {
              default: ["all"]
            }
          }
        },
      });

      const wrapper = mount(<SpaceAwarePrivilegeForm {...props} />);

      const table = wrapper.find(PrivilegeSpaceTable);
      expect(table).toHaveLength(1);

      const addPrivilegeButton = wrapper.find('button[data-test-subj="addSpacePrivilegeButton"]');
      expect(addPrivilegeButton).toHaveLength(1);
    });
  });

  describe('with minimum privilege set to "none"', () => {
    it('does not show a warning about minimum privilege', () => {
      const props = buildProps({
        role: {
          elasticsearch: {
            cluster: ['manage']
          },
          kibana: {
            global: [],
            space: {
              default: ["all"]
            }
          }
        },
      });

      const wrapper = mount(<SpaceAwarePrivilegeForm {...props} />);

      const warning = wrapper.find(PrivilegeCalloutWarning);
      expect(warning).toHaveLength(0);
    });

    it('allows space privileges to be customized', () => {
      const props = buildProps({
        role: {
          elasticsearch: {
            cluster: ['manage']
          },
          kibana: {
            global: [],
            space: {
              default: ["all"]
            }
          }
        },
      });

      const wrapper = mount(<SpaceAwarePrivilegeForm {...props} />);

      const table = wrapper.find(PrivilegeSpaceTable);
      expect(table).toHaveLength(1);

      const addPrivilegeButton = wrapper.find('button[data-test-subj="addSpacePrivilegeButton"]');
      expect(addPrivilegeButton).toHaveLength(1);
    });
  });
});
