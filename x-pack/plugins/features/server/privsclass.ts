/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// eslint-disable-next-line max-classes-per-file
class Privilege {
  private id: string;
  private ui: string[];
  private savedObject: any;

  includeInBasePrivilege: 'Bitwise all/read' | undefined;
  // remove excludeFromBasePrivileges
}

class FeaturePrivileges {
  private privileges: Privilege[];

  private subFeaturePrivileges?: SubFeaturePrivileges[];
}

class SubFeaturePrivileges {
  private name: string;
  private privileges: Privilege[];
}

const dashboardPrivileges = {
  privileges: [DashboardAll, DashboardRead, CreateShortUrl],
  addons: [
    {
      name: 'Alerting',
      privileges: [
        new Privilege(DashboardAlertingAll, DashboardAlertingRead),
        DashboardAlertingMute,
      ],
    },
  ],
};

const visualizePrivileges = {
  required: [All, Read, Custom],
  optional: [
    {
      name: 'timelion',
      privileges: [CreateTimelionViz, vizReadTimelion],
    },
    {
      name: 'Alerting',
      privileges: [
        new Privilege(DashboardAlertingAll, DashboardAlertingRead),
        DashboardAlertingMute,
      ],
    },
  ],
};

const vizReadTimelion = new Privilege();
const vizReadLens = new Privilege();
const vizReadEtc = new Privilege();
const vizRead = new Privilege(vizReadTimelion, vizReadLens, vizReadEtc);

const grantsAccessToFeature = new Privilege(dashboardFeature);

const createShortUrl = new Privilege({
  savedObject: {
    all: ['short-url'],
  },
  ui: ['create-short-url'],
});

const read = new Privilege({});

const allPrivilege = new Privilege(createShortUrl, readDashboard, grantsAccessToFeature);
