/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { Feature } from './feature';
import { FeaturePrivilege } from './feature_privilege';

export interface BuildOSSFeaturesParams {
  savedObjectTypes: string[];
  includeTimelion: boolean;
}

export const buildOSSFeatures = ({ savedObjectTypes, includeTimelion }: BuildOSSFeaturesParams) => {
  const viewAlerts = new FeaturePrivilege({
    id: 'view-alerts',
    name: 'View Alerts',
    savedObject: {
      all: [],
      read: ['alert'],
    },
    ui: ['viewAlerts'],
  });

  const muteAlerts = new FeaturePrivilege({
    id: 'mute-alerts',
    name: 'Mute Alerts',
    savedObject: {
      all: [],
      read: ['alert'],
    },
    ui: ['viewAlerts', 'muteAlerts'],
  });

  const createAlerts = new FeaturePrivilege({
    id: 'create-alerts',
    name: 'Create Alerts',
    savedObject: {
      all: ['alert'],
      read: [],
    },
    ui: ['viewAlerts', 'createAlerts'],
  });
  const readAlerts = new FeaturePrivilege({
    id: 'read-alerts',
    name: 'Read',
    savedObject: {
      all: [],
      read: ['alert'],
    },
    ui: ['viewAlerts'],
  });

  const allAlerts = new FeaturePrivilege({
    id: 'all-alerts',
    name: 'All',
    savedObject: {
      all: ['alert'],
      read: [],
    },
    ui: ['viewAlerts', 'createAlerts'],
  });

  const viewSavedSearch = new FeaturePrivilege({
    id: 'view-saved-search',
    name: 'View Saved Search',
    savedObject: {
      all: [],
      read: ['search'],
    },
    ui: [],
  });

  const createSavedSearch = new FeaturePrivilege({
    id: 'create-saved-search',
    name: 'Create Saved Search',
    savedObject: {
      all: ['search'],
      read: [],
    },
    ui: [],
  });

  const createShortUrl = new FeaturePrivilege({
    id: 'create-short-url',
    name: 'Create Short URL',
    savedObject: {
      all: ['url'],
      read: [],
    },
    ui: ['createShortUrl'],
  });

  const discoverRead = new FeaturePrivilege(
    {
      id: 'read',
      name: 'Read',
      savedObject: {
        all: [],
        read: ['config', 'telemetry'],
      },
      ui: [],
    },
    viewSavedSearch,
    viewAlerts
  );

  const discoverAll = new FeaturePrivilege(
    {
      id: 'all',
      name: 'All',
      savedObject: {
        all: ['telemetry'],
        read: ['config'],
      },
      ui: [],
    },
    createSavedSearch,
    createShortUrl,
    createAlerts
  );

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
        required: [discoverAll, discoverRead],
        optional: [
          {
            name: 'Sharing',
            privileges: [createShortUrl],
          },
          {
            name: 'Alerting',
            privileges: [allAlerts, readAlerts, viewAlerts, createAlerts],
          },
        ],
      },
    },
    {
      id: 'visualize',
      name: i18n.translate('xpack.features.visualizeFeatureName', {
        defaultMessage: 'Visualize',
      }),
      icon: 'visualizeApp',
      navLinkId: 'kibana:visualize',
      app: ['kibana', 'lens'],
      catalogue: ['visualize'],
      privileges: {
        name: '',
        privileges: [
          {
            id: 'all',
            name: 'All',
            savedObject: {
              all: ['visualization', 'url', 'query', 'lens'],
              read: ['index-pattern', 'search'],
            },
            ui: ['show', 'createShortUrl', 'delete', 'save', 'saveQuery'],
          },
          {
            id: 'read',
            name: 'Read',
            savedObject: {
              all: [],
              read: ['index-pattern', 'search', 'visualization', 'query', 'lens'],
            },
            ui: ['show'],
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
