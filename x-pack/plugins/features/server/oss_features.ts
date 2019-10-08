/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { Feature } from './feature';

export interface BuildOSSFeaturesParams {
  savedObjectTypes: string[];
  includeTimelion: boolean;
}

export const buildOSSFeatures = ({
  savedObjectTypes,
  includeTimelion,
}: BuildOSSFeaturesParams): Feature[] => {
  return [
    {
      id: 'discover',
      name: i18n.translate('xpack.features.discoverFeatureName', {
        defaultMessage: 'Discover',
      }),
      icon: 'discoverApp',
      navLinkId: 'kibana:discover',
      app: ['kibana'],
      catalogue: ['discover'],
      privileges: {
        minimum: {
          savedObject: {
            all: [],
            read: ['index-pattern', 'search', 'query'],
          },
          ui: ['show'],
        },
        all: {
          savedObject: {
            all: ['search', 'url', 'query'],
            read: ['index-pattern'],
          },
          ui: ['show', 'createShortUrl', 'save', 'saveQuery'],
        },
        read: {
          savedObject: {
            all: [],
            read: ['index-pattern', 'search', 'query'],
          },
          ui: ['show'],
        },
      },
    },
    {
      id: 'visualize',
      name: i18n.translate('xpack.features.visualizeFeatureName', {
        defaultMessage: 'Visualize',
      }),
      icon: 'visualizeApp',
      navLinkId: 'kibana:visualize',
      app: ['kibana'],
      catalogue: ['visualize'],
      privileges: {
        minimum: {
          savedObject: {
            all: [],
            read: ['index-pattern', 'search', 'visualization', 'query', 'lens'],
          },
          ui: ['show'],
        },
        all: {
          savedObject: {
            all: ['dashboard', 'url', 'query', 'timelion-sheet', 'alert', 'visualization', 'lens'],
            read: ['index-pattern', 'search', 'timelion-sheet', 'canvas-workpad', 'map'],
          },
          ui: [
            'createNew',
            'show',
            'showWriteControls',
            'saveQuery',
            'createShortUrl',
            'createReports',
            'createAlerts',
            'muteAlerts',
            'viewAlerts',
          ],
        },
        read: {
          savedObject: {
            all: [],
            read: [
              'index-pattern',
              'search',
              'visualization',
              'timelion-sheet',
              'canvas-workpad',
              'map',
              'dashboard',
              'query',
              'alert',
            ],
          },
          ui: ['show', 'viewAlerts'],
        },
        custom: [
          {
            categoryName: 'Sharing',
            privileges: [
              {
                id: 'create-short-urls',
                name: 'Create short-urls',
                privilegeType: 'all',
                savedObject: {
                  all: ['url'],
                  read: [],
                },
                ui: ['show', 'createShortUrl'],
              },
              {
                id: 'create-reports',
                name: 'Create Reports',
                privilegeType: 'all',
                savedObject: {
                  all: [],
                  read: [],
                },
                ui: ['show', 'createReports'],
              },
            ],
          },
          {
            categoryName: 'Create visualizations',
            privileges: [
              {
                id: 'create-traditional-viz',
                name: 'Create traditional visualizations',
                privilegeType: 'all',
                savedObject: {
                  all: ['visualization'],
                  read: ['index-pattern', 'search', 'query', 'lens'],
                },
                ui: ['show'],
              },
              {
                id: 'create-timelion-viz',
                name: 'Create timelion visualizations',
                privilegeType: 'all',
                savedObject: {
                  all: ['timelion-sheet'],
                  read: [],
                },
                ui: ['createNew', 'show', 'showWriteControls'],
              },
            ],
          },
          {
            categoryName: 'Alerting',
            privileges: [
              {
                id: 'view-alerts',
                name: 'View alerts',
                privilegeType: 'read',
                savedObject: {
                  all: [],
                  read: ['alert'],
                },
                ui: ['viewAlerts'],
              },
              {
                id: 'mute-alerts',
                name: 'Mute alerts',
                privilegeType: 'all',
                savedObject: {
                  all: ['alert'],
                  read: [],
                },
                ui: ['viewAlerts', 'muteAlerts'],
              },
              {
                id: 'create-alerts',
                name: 'Create alerts',
                privilegeType: 'all',
                savedObject: {
                  all: ['alert'],
                  read: [],
                },
                ui: ['viewAlerts', 'createAlerts'],
              },
            ],
          },
          {
            categoryName: 'Excluded',
            privileges: [
              {
                id: 'secret-beta-feature',
                name: 'Secret beta feature',
                privilegeType: 'excluded',
                excludeFromBasePrivileges: true,
                savedObject: {
                  all: ['secret-type'],
                  read: ['alert'],
                },
                ui: ['viewAlerts'],
              },
            ],
          },
        ],
      },
    },
    {
      id: 'dashboard',
      name: i18n.translate('xpack.features.dashboardFeatureName', {
        defaultMessage: 'Dashboard',
      }),
      icon: 'dashboardApp',
      navLinkId: 'kibana:dashboard',
      app: ['kibana'],
      catalogue: ['dashboard'],
      privileges: {
        minimum: {
          savedObject: {
            all: [],
            read: [
              'index-pattern',
              'search',
              'visualization',
              'timelion-sheet',
              'canvas-workpad',
              'map',
              'dashboard',
              'query',
            ],
          },
          ui: ['show'],
        },
        all: {
          savedObject: {
            all: ['dashboard', 'url', 'query'],
            read: [
              'index-pattern',
              'search',
              'visualization',
              'timelion-sheet',
              'canvas-workpad',
              'map',
            ],
          },
          ui: ['createNew', 'show', 'showWriteControls', 'saveQuery'],
        },
        read: {
          savedObject: {
            all: [],
            read: [
              'index-pattern',
              'search',
              'visualization',
              'timelion-sheet',
              'canvas-workpad',
              'map',
              'dashboard',
              'query',
            ],
          },
          ui: ['show'],
        },
      },
    },
    {
      id: 'dev_tools',
      name: i18n.translate('xpack.features.devToolsFeatureName', {
        defaultMessage: 'Dev Tools',
      }),
      icon: 'devToolsApp',
      navLinkId: 'kibana:dev_tools',
      app: ['kibana'],
      catalogue: ['console', 'searchprofiler', 'grokdebugger'],
      privileges: {
        minimum: {
          api: ['console'],
          savedObject: {
            all: [],
            read: [],
          },
          ui: ['show'],
        },
        all: {
          api: ['console'],
          savedObject: {
            all: [],
            read: [],
          },
          ui: ['show', 'save'],
        },
        read: {
          api: ['console'],
          savedObject: {
            all: [],
            read: [],
          },
          ui: ['show'],
        },
      },
      privilegesTooltip: i18n.translate('xpack.features.devToolsPrivilegesTooltip', {
        defaultMessage:
          'User should also be granted the appropriate Elasticsearch cluster and index privileges',
      }),
    },
    {
      id: 'advancedSettings',
      name: i18n.translate('xpack.features.advancedSettingsFeatureName', {
        defaultMessage: 'Advanced Settings',
      }),
      icon: 'advancedSettingsApp',
      app: ['kibana'],
      catalogue: ['advanced_settings'],
      management: {
        kibana: ['settings'],
      },
      privileges: {
        minimum: {
          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        },
        all: {
          savedObject: {
            all: ['config'],
            read: [],
          },
          ui: ['save'],
        },
        read: {
          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        },
      },
    },
    {
      id: 'indexPatterns',
      name: i18n.translate('xpack.features.indexPatternFeatureName', {
        defaultMessage: 'Index Pattern Management',
      }),
      icon: 'indexPatternApp',
      app: ['kibana'],
      catalogue: ['index_patterns'],
      management: {
        kibana: ['index_patterns'],
      },
      privileges: {
        minimum: {
          savedObject: {
            all: [],
            read: ['index-pattern'],
          },
          ui: [],
        },
        all: {
          savedObject: {
            all: ['index-pattern'],
            read: [],
          },
          ui: ['save'],
        },
        read: {
          savedObject: {
            all: [],
            read: ['index-pattern'],
          },
          ui: [],
        },
      },
    },
    {
      id: 'savedObjectsManagement',
      name: i18n.translate('xpack.features.savedObjectsManagementFeatureName', {
        defaultMessage: 'Saved Objects Management',
      }),
      icon: 'savedObjectsApp',
      app: ['kibana'],
      catalogue: ['saved_objects'],
      management: {
        kibana: ['objects'],
      },
      privileges: {
        minimum: {
          api: ['copySavedObjectsToSpaces'],
          savedObject: {
            all: [],
            read: [...savedObjectTypes],
          },
          ui: ['read'],
        },
        all: {
          api: ['copySavedObjectsToSpaces'],
          savedObject: {
            all: [...savedObjectTypes],
            read: [],
          },
          ui: ['read', 'edit', 'delete', 'copyIntoSpace'],
        },
        read: {
          api: ['copySavedObjectsToSpaces'],
          savedObject: {
            all: [],
            read: [...savedObjectTypes],
          },
          ui: ['read'],
        },
      },
    },
    ...(includeTimelion ? [timelionFeature] : []),
  ];
};

const timelionFeature: Feature = {
  id: 'timelion',
  name: 'Timelion',
  icon: 'timelionApp',
  navLinkId: 'timelion',
  app: ['timelion', 'kibana'],
  catalogue: ['timelion'],
  privileges: {
    minimum: {
      savedObject: {
        all: [],
        read: ['index-pattern', 'timelion-sheet'],
      },
      ui: [],
    },
    all: {
      savedObject: {
        all: ['timelion-sheet'],
        read: ['index-pattern'],
      },
      ui: ['save'],
    },
    read: {
      savedObject: {
        all: [],
        read: ['index-pattern', 'timelion-sheet'],
      },
      ui: [],
    },
  },
};
