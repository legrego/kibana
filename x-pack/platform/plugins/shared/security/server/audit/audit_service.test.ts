/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { accessSync, mkdirSync } from 'fs';
import type { Socket } from 'net';
import { lastValueFrom, Observable, of } from 'rxjs';

import type { ServiceStatusLevel } from '@kbn/core/server';
import { ServiceStatusLevels } from '@kbn/core/server';
import { coreMock } from '@kbn/core/server/mocks';
import type { FakeRawRequest } from '@kbn/core-http-server';
import { httpServerMock, httpServiceMock } from '@kbn/core-http-server-mocks';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { asSpaceId } from '@kbn/core-spaces-common';
import type { AuditEvent } from '@kbn/security-plugin-types-server';

import {
  AuditService,
  createLoggingConfig,
  DROPPED_EVENT_REPORT_INTERVAL,
  filterEvent,
  getForwardedFor,
  RECORD_USAGE_INTERVAL,
} from './audit_service';
import { licenseMock } from '../../common/licensing/index.mock';
import type { ConfigType } from '../config';
import { ConfigSchema, createConfig } from '../config';

// Only the filesystem calls used by the pre-flight writability probe are mocked; the rest of
// `fs` keeps its real behavior so unrelated modules (e.g. config path resolution) still work.
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  mkdirSync: jest.fn(),
  accessSync: jest.fn(),
}));

jest.useFakeTimers({ legacyFakeTimers: true });

const logger = loggingSystemMock.createLogger();
const license = licenseMock.create();

const createAuditConfig = (settings: Partial<ConfigType['audit']>) => {
  return createConfig(ConfigSchema.validate({ audit: settings }), logger, { isTLSEnabled: false })
    .audit;
};

const config = createAuditConfig({ enabled: true });
const { logging } = coreMock.createSetup();
const http = httpServiceMock.createSetupContract();
const getCurrentUser = jest
  .fn()
  .mockReturnValue({ username: 'jdoe', roles: ['admin'], profile_uid: 'uid' });
const getSpaceId = jest.fn().mockReturnValue('default');
const getSID = jest.fn().mockResolvedValue('SESSION_ID');
const recordAuditLoggingUsage = jest.fn();

// The pre-flight writability probe in `AuditService` touches the filesystem. The fs calls are
// mocked so tests exercise the resilience logic without writing real files. Defaults to a
// writable path; failure scenarios override these per test.
const mkdirSyncMock = mkdirSync as jest.Mock;
const accessSyncMock = accessSync as jest.Mock;

beforeEach(() => {
  logger.info.mockClear();
  logger.warn.mockClear();
  logger.error.mockClear();
  logging.configure.mockClear();
  logger.isLevelEnabled.mockClear().mockReturnValue(true);
  recordAuditLoggingUsage.mockClear();
  http.registerOnPostAuth.mockClear();

  mkdirSyncMock.mockReset().mockReturnValue(undefined);
  accessSyncMock.mockReset().mockReturnValue(undefined);
});

describe('#setup', () => {
  it('returns the expected contract', () => {
    const audit = new AuditService(logger);
    expect(
      audit.setup({
        license,
        config,
        logging,
        http,
        getCurrentUser,
        getSpaceId,
        getSID,
        recordAuditLoggingUsage,
      })
    ).toMatchInlineSnapshot(`
      Object {
        "asScoped": [Function],
        "withoutRequest": Object {
          "enabled": true,
          "includeSavedObjectNames": true,
          "log": [Function],
        },
      }
    `);
    audit.stop();
  });

  it('configures logging correctly when using ecs logger', async () => {
    const audit = new AuditService(logger);
    audit.setup({
      license,
      config: {
        enabled: true,
        include_saved_object_names: false,
        appender: {
          type: 'console',
          layout: {
            type: 'pattern',
          },
        },
      },
      logging,
      http,
      getCurrentUser,
      getSpaceId,
      getSID,
      recordAuditLoggingUsage,
    });
    expect(logging.configure).toHaveBeenCalledWith(expect.any(Observable));
    audit.stop();
  });

  it('records feature usage correctly when using ecs logger', async () => {
    const audit = new AuditService(logger);
    audit.setup({
      license: licenseMock.create({
        allowAuditLogging: true,
      }),
      config: {
        enabled: true,
        include_saved_object_names: false,
        appender: {
          type: 'console',
          layout: {
            type: 'pattern',
          },
        },
      },
      logging,
      http,
      getCurrentUser,
      getSpaceId,
      getSID,
      recordAuditLoggingUsage,
    });
    expect(recordAuditLoggingUsage).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(RECORD_USAGE_INTERVAL);
    expect(recordAuditLoggingUsage).toHaveBeenCalledTimes(2);
    jest.advanceTimersByTime(RECORD_USAGE_INTERVAL);
    expect(recordAuditLoggingUsage).toHaveBeenCalledTimes(3);
    audit.stop();
  });

  it('does not record feature usage when disabled', async () => {
    const audit = new AuditService(logger);
    audit.setup({
      license,
      config: {
        enabled: false,
        include_saved_object_names: false,
        appender: undefined,
      },
      logging,
      http,
      getCurrentUser,
      getSpaceId,
      getSID,
      recordAuditLoggingUsage,
    });
    expect(recordAuditLoggingUsage).not.toHaveBeenCalled();
    jest.advanceTimersByTime(RECORD_USAGE_INTERVAL);
    expect(recordAuditLoggingUsage).not.toHaveBeenCalled();
    jest.advanceTimersByTime(RECORD_USAGE_INTERVAL);
    expect(recordAuditLoggingUsage).not.toHaveBeenCalled();
    audit.stop();
  });

  it('registers post auth hook', () => {
    const audit = new AuditService(logger);
    audit.setup({
      license,
      config,
      logging,
      http,
      getCurrentUser,
      getSpaceId,
      getSID,
      recordAuditLoggingUsage,
    });
    expect(http.registerOnPostAuth).toHaveBeenCalledWith(expect.any(Function));
    audit.stop();
  });
});

describe('#asScoped', () => {
  it('logs event enriched with meta data from request', async () => {
    const audit = new AuditService(logger);
    const auditSetup = audit.setup({
      license,
      config,
      logging,
      http,
      getCurrentUser,
      getSpaceId,
      getSID,
      recordAuditLoggingUsage,
    });
    const request = httpServerMock.createKibanaRequest({
      socket: { remoteAddress: '3.3.3.3' } as Socket,
      headers: {
        'x-forwarded-for': '1.1.1.1, 2.2.2.2',
      },
      kibanaRequestState: {
        requestId: 'REQUEST_ID',
        requestUuid: 'REQUEST_UUID',
        startTime: Date.now(),
      },
    });

    await auditSetup.asScoped(request).log({
      message: 'MESSAGE',
      event: { action: 'ACTION' },
      http: { request: { method: 'GET' } },
    });
    expect(logger.info).toHaveBeenLastCalledWith('MESSAGE', {
      event: { action: 'ACTION' },
      kibana: { space_id: 'default', session_id: 'SESSION_ID' },
      trace: { id: 'REQUEST_ID' },
      client: { ip: '3.3.3.3' },
      http: {
        request: { method: 'GET', headers: { 'x-forwarded-for': '1.1.1.1, 2.2.2.2' } },
      },
      user: { id: 'uid', name: 'jdoe', roles: ['admin'] },
    });
    audit.stop();
  });

  it('logs event enriched with meta data from fake request', async () => {
    const audit = new AuditService(logger);
    const auditSetup = audit.setup({
      license,
      config,
      logging,
      http,
      getCurrentUser,
      getSpaceId: () => undefined,
      getSID: () => Promise.resolve(undefined),
      recordAuditLoggingUsage,
    });

    const fakeRawRequest: FakeRawRequest = {
      headers: {},
    };
    const request = kibanaRequestFactory(fakeRawRequest);

    await auditSetup.asScoped(request).log({
      message: 'MESSAGE',
      event: { action: 'ACTION' },
    });
    expect(logger.info).toHaveBeenLastCalledWith('MESSAGE', {
      client: {
        ip: undefined,
      },
      event: {
        action: 'ACTION',
      },
      http: undefined,
      kibana: {
        session_id: undefined,
        space_id: undefined,
      },
      trace: {
        id: expect.any(String),
      },
      user: {
        id: 'uid',
        name: 'jdoe',
        roles: ['admin'],
      },
    });
    audit.stop();
  });

  it('logs space_id from a fake request that carries a spaceId', async () => {
    const audit = new AuditService(logger);
    const auditSetup = audit.setup({
      license,
      config,
      logging,
      http,
      getCurrentUser,
      // Mirror real wiring (spacesService.getSpaceId) by sourcing the space id
      // directly from the request.
      getSpaceId: (req) => req.spaceId,
      getSID: () => Promise.resolve(undefined),
      recordAuditLoggingUsage,
    });

    const fakeRawRequest: FakeRawRequest = {
      headers: {},
      spaceId: asSpaceId('my-space'),
    };
    const request = kibanaRequestFactory(fakeRawRequest);

    await auditSetup.asScoped(request).log({
      message: 'MESSAGE',
      event: { action: 'ACTION' },
    });
    expect(logger.info).toHaveBeenLastCalledWith(
      'MESSAGE',
      expect.objectContaining({
        kibana: expect.objectContaining({ space_id: 'my-space' }),
      })
    );
    audit.stop();
  });

  it('does not log to audit logger if event matches ignore filter', async () => {
    const audit = new AuditService(logger);
    const auditSetup = audit.setup({
      license,
      config: {
        enabled: true,
        include_saved_object_names: false,
        appender: {
          type: 'console',
          layout: {
            type: 'json',
          },
        },
        ignore_filters: [{ actions: ['ACTION'] }],
      },
      logging,
      http,
      getCurrentUser,
      getSpaceId,
      getSID,
      recordAuditLoggingUsage,
    });
    const request = httpServerMock.createKibanaRequest({
      kibanaRequestState: {
        requestId: 'REQUEST_ID',
        requestUuid: 'REQUEST_UUID',
        startTime: Date.now(),
      },
    });

    await auditSetup.asScoped(request).log({ message: 'MESSAGE', event: { action: 'ACTION' } });
    expect(logger.info).not.toHaveBeenCalled();
    audit.stop();
  });

  it('does not log to audit logger if no event was generated', async () => {
    const audit = new AuditService(logger);
    const auditSetup = audit.setup({
      license,
      config: {
        enabled: true,
        include_saved_object_names: false,
        appender: {
          type: 'console',
          layout: {
            type: 'json',
          },
        },
        ignore_filters: [{ actions: ['ACTION'] }],
      },
      logging,
      http,
      getCurrentUser,
      getSpaceId,
      getSID,
      recordAuditLoggingUsage,
    });
    const request = httpServerMock.createKibanaRequest({
      kibanaRequestState: {
        requestId: 'REQUEST_ID',
        requestUuid: 'REQUEST_UUID',
        startTime: Date.now(),
      },
    });

    await auditSetup.asScoped(request).log(undefined);
    expect(logger.info).not.toHaveBeenCalled();
    audit.stop();
  });

  it('does not log to audit logger if info logging level is disabled', async () => {
    logger.isLevelEnabled.mockReturnValue(false);

    const audit = new AuditService(logger);
    const auditSetup = audit.setup({
      license,
      config,
      logging,
      http,
      getCurrentUser,
      getSpaceId,
      getSID,
      recordAuditLoggingUsage,
    });
    const request = httpServerMock.createKibanaRequest({
      socket: { remoteAddress: '3.3.3.3' } as Socket,
      headers: {
        'x-forwarded-for': '1.1.1.1, 2.2.2.2',
      },
      kibanaRequestState: {
        requestId: 'REQUEST_ID',
        requestUuid: 'REQUEST_UUID',
        startTime: Date.now(),
      },
    });

    await auditSetup.asScoped(request).log({
      message: 'MESSAGE',
      event: { action: 'ACTION' },
      http: { request: { method: 'GET' } },
    });

    expect(logger.info).not.toHaveBeenCalled();
    expect(logger.isLevelEnabled).toHaveBeenCalledTimes(1);
    expect(logger.isLevelEnabled).toHaveBeenCalledWith('info');

    audit.stop();
  });
});

describe('#withoutRequest', () => {
  it('logs event without additional meta data', async () => {
    const audit = new AuditService(logger);
    const auditSetup = audit.setup({
      license,
      config,
      logging,
      http,
      getCurrentUser,
      getSpaceId,
      getSID,
      recordAuditLoggingUsage,
    });

    await auditSetup.withoutRequest.log({ message: 'MESSAGE', event: { action: 'ACTION' } });
    expect(logger.info).toHaveBeenCalledWith('MESSAGE', {
      event: { action: 'ACTION' },
    });
    audit.stop();
  });

  it('does not log to audit logger if event matches ignore filter', async () => {
    const audit = new AuditService(logger);
    const auditSetup = audit.setup({
      license,
      config: {
        enabled: true,
        include_saved_object_names: false,
        appender: {
          type: 'console',
          layout: {
            type: 'json',
          },
        },
        ignore_filters: [{ actions: ['ACTION'] }],
      },
      logging,
      http,
      getCurrentUser,
      getSpaceId,
      getSID,
      recordAuditLoggingUsage,
    });

    await auditSetup.withoutRequest.log({ message: 'MESSAGE', event: { action: 'ACTION' } });
    expect(logger.info).not.toHaveBeenCalled();
    audit.stop();
  });

  it('does not log to audit logger if no event was generated', async () => {
    const audit = new AuditService(logger);
    const auditSetup = audit.setup({
      license,
      config: {
        enabled: true,
        include_saved_object_names: false,
        appender: {
          type: 'console',
          layout: {
            type: 'json',
          },
        },
        ignore_filters: [{ actions: ['ACTION'] }],
      },
      logging,
      http,
      getCurrentUser,
      getSpaceId,
      getSID,
      recordAuditLoggingUsage,
    });

    await auditSetup.withoutRequest.log(undefined);
    expect(logger.info).not.toHaveBeenCalled();
    audit.stop();
  });
});

describe('audit logging resilience', () => {
  const baseParams = () => ({
    license,
    logging,
    http,
    getCurrentUser,
    getSpaceId,
    getSID,
    recordAuditLoggingUsage,
  });

  const consoleAuditConfig = {
    enabled: true,
    include_saved_object_names: false,
    appender: {
      type: 'console' as const,
      layout: { type: 'pattern' as const },
    },
  };

  const throwErofs = () => {
    const error: NodeJS.ErrnoException = new Error(
      "EROFS: read-only file system, mkdir '/usr/share/kibana/logs'"
    );
    error.code = 'EROFS';
    throw error;
  };

  describe('pre-flight validation', () => {
    it('configures audit logging normally when the file path is writable', () => {
      const audit = new AuditService(logger);
      audit.setup({ ...baseParams(), config });

      expect(mkdirSyncMock).toHaveBeenCalled();
      expect(logging.configure).toHaveBeenCalledWith(expect.any(Observable));
      expect(audit.auditStatus$.getValue().level).toBe(ServiceStatusLevels.available);
      audit.stop();
    });

    it('enters degraded state when the file path is not writable', () => {
      mkdirSyncMock.mockImplementation(throwErofs);

      const audit = new AuditService(logger);
      audit.setup({ ...baseParams(), config });

      expect(audit.auditStatus$.getValue().level).toBe(ServiceStatusLevels.degraded);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining(
          'Audit logging is enabled but Kibana was unable to write an audit event'
        )
      );
      audit.stop();
    });

    it('drops and counts events when degraded after a failed pre-flight check', async () => {
      mkdirSyncMock.mockImplementation(throwErofs);

      const audit = new AuditService(logger);
      const auditSetup = audit.setup({ ...baseParams(), config });

      await auditSetup.withoutRequest.log({ message: 'MESSAGE', event: { action: 'ACTION' } });

      expect(logger.info).not.toHaveBeenCalled();

      jest.advanceTimersByTime(DROPPED_EVENT_REPORT_INTERVAL);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('1 audit events dropped in the last 5 minutes')
      );
      audit.stop();
    });

    it('skips validation for console appenders', () => {
      const audit = new AuditService(logger);
      audit.setup({ ...baseParams(), config: consoleAuditConfig });

      expect(mkdirSyncMock).not.toHaveBeenCalled();
      expect(audit.auditStatus$.getValue().level).toBe(ServiceStatusLevels.available);
      audit.stop();
    });

    it('skips validation when audit logging is disabled', () => {
      const audit = new AuditService(logger);
      audit.setup({
        ...baseParams(),
        config: { enabled: false, include_saved_object_names: false, appender: undefined },
      });

      expect(mkdirSyncMock).not.toHaveBeenCalled();
      expect(audit.auditStatus$.getValue().level).toBe(ServiceStatusLevels.available);
      audit.stop();
    });
  });

  describe('runtime error boundary', () => {
    it('enters degraded state and drops the event when the logger throws', async () => {
      logger.info.mockImplementationOnce(throwErofs);

      const audit = new AuditService(logger);
      const auditSetup = audit.setup({ ...baseParams(), config });

      await auditSetup.withoutRequest.log({ message: 'MESSAGE', event: { action: 'ACTION' } });

      expect(logger.info).toHaveBeenCalledTimes(1);
      expect(audit.auditStatus$.getValue().level).toBe(ServiceStatusLevels.degraded);

      jest.advanceTimersByTime(DROPPED_EVENT_REPORT_INTERVAL);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('1 audit events dropped in the last 5 minutes')
      );
      audit.stop();
    });

    it('drops subsequent events via the fast-path without calling the logger again', async () => {
      logger.info.mockImplementationOnce(throwErofs);

      const audit = new AuditService(logger);
      const auditSetup = audit.setup({ ...baseParams(), config });

      await auditSetup.withoutRequest.log({ message: 'ONE', event: { action: 'ACTION' } });
      await auditSetup.withoutRequest.log({ message: 'TWO', event: { action: 'ACTION' } });
      await auditSetup.withoutRequest.log({ message: 'THREE', event: { action: 'ACTION' } });

      expect(logger.info).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(DROPPED_EVENT_REPORT_INTERVAL);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('3 audit events dropped in the last 5 minutes')
      );
      audit.stop();
    });

    it('resets the dropped event counter after each periodic report', async () => {
      logger.info.mockImplementationOnce(throwErofs);

      const audit = new AuditService(logger);
      const auditSetup = audit.setup({ ...baseParams(), config });

      await auditSetup.withoutRequest.log({ message: 'MESSAGE', event: { action: 'ACTION' } });

      jest.advanceTimersByTime(DROPPED_EVENT_REPORT_INTERVAL);
      expect(logger.warn).toHaveBeenCalledTimes(1);

      logger.warn.mockClear();
      jest.advanceTimersByTime(DROPPED_EVENT_REPORT_INTERVAL);
      expect(logger.warn).not.toHaveBeenCalled();
      audit.stop();
    });
  });

  describe('degraded status', () => {
    it('persists degraded status across multiple log events', async () => {
      mkdirSyncMock.mockImplementation(throwErofs);

      const audit = new AuditService(logger);
      const auditSetup = audit.setup({ ...baseParams(), config });

      await auditSetup.withoutRequest.log({ message: 'ONE', event: { action: 'ACTION' } });
      await auditSetup.withoutRequest.log({ message: 'TWO', event: { action: 'ACTION' } });

      expect(audit.auditStatus$.getValue().level).toBe(ServiceStatusLevels.degraded);

      jest.advanceTimersByTime(DROPPED_EVENT_REPORT_INTERVAL);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('2 audit events dropped in the last 5 minutes')
      );
      audit.stop();
    });

    it('emits degraded status via the auditStatus$ observable', () => {
      mkdirSyncMock.mockImplementation(throwErofs);

      const audit = new AuditService(logger);
      const statuses: ServiceStatusLevel[] = [];
      const subscription = audit.auditStatus$.subscribe((status) => statuses.push(status.level));

      audit.setup({ ...baseParams(), config });

      expect(statuses).toEqual([ServiceStatusLevels.available, ServiceStatusLevels.degraded]);
      subscription.unsubscribe();
      audit.stop();
    });
  });
});

describe('#createLoggingConfig', () => {
  test('sets log level to `info` when audit logging is enabled and appender is defined', async () => {
    const features$ = of({
      allowAuditLogging: true,
    });

    const loggingConfig = await features$
      .pipe(
        createLoggingConfig({
          enabled: true,
          include_saved_object_names: false,
          appender: {
            type: 'console',
            layout: {
              type: 'pattern',
            },
          },
        })
      )
      .toPromise();

    expect(loggingConfig).toMatchInlineSnapshot(`
      Object {
        "appenders": Object {
          "auditTrailAppender": Object {
            "layout": Object {
              "type": "pattern",
            },
            "type": "console",
          },
        },
        "loggers": Array [
          Object {
            "appenders": Array [
              "auditTrailAppender",
            ],
            "level": "info",
            "name": "audit.ecs",
          },
        ],
      }
    `);
  });

  test('sets log level to `off` when audit logging is disabled', async () => {
    const features$ = of({
      allowAuditLogging: true,
    });

    const loggingConfig = await lastValueFrom(
      features$.pipe(
        createLoggingConfig({
          enabled: false,
          include_saved_object_names: false,
          appender: {
            type: 'console',
            layout: {
              type: 'pattern',
            },
          },
        })
      )
    );

    expect(loggingConfig.loggers![0].level).toEqual('off');
  });

  test('sets log level to `off` when license does not allow audit logging', async () => {
    const features$ = of({
      allowAuditLogging: false,
    });

    const loggingConfig = await lastValueFrom(
      features$.pipe(
        createLoggingConfig({
          enabled: true,
          include_saved_object_names: false,
          appender: {
            type: 'console',
            layout: {
              type: 'pattern',
            },
          },
        })
      )
    );

    expect(loggingConfig.loggers![0].level).toEqual('off');
  });
});

describe('#getForwardedFor', () => {
  it('extracts x-forwarded-for header from request', () => {
    const request = httpServerMock.createKibanaRequest({
      headers: {
        'x-forwarded-for': '1.1.1.1',
      },
    });
    expect(getForwardedFor(request)).toBe('1.1.1.1');
  });

  it('concatenates multiple headers into single string in correct order', () => {
    const request = httpServerMock.createKibanaRequest({
      headers: {
        // @ts-expect-error Headers can be arrays but HAPI mocks are incorrectly typed
        'x-forwarded-for': ['1.1.1.1, 2.2.2.2', '3.3.3.3'],
      },
    });
    expect(getForwardedFor(request)).toBe('1.1.1.1, 2.2.2.2, 3.3.3.3');
  });

  it('returns undefined when header not present', () => {
    const request = httpServerMock.createKibanaRequest();
    expect(getForwardedFor(request)).toBeUndefined();
  });
});

describe('#filterEvent', () => {
  let event: AuditEvent;

  beforeEach(() => {
    event = {
      message: 'this is my audit message',
      event: {
        action: 'http_request',
        category: ['web'],
        type: ['access'],
        outcome: 'success',
      },
      user: {
        name: 'jdoe',
      },
      kibana: {
        space_id: 'default',
      },
    };
  });

  test('keeps event when ignore filters are undefined or empty', () => {
    expect(filterEvent(event, undefined)).toBeTruthy();
    expect(filterEvent(event, [])).toBeTruthy();
  });

  test('filters event correctly when a single match is found per criteria', () => {
    expect(filterEvent(event, [{ actions: ['NO_MATCH'] }])).toBeTruthy();
    expect(filterEvent(event, [{ actions: ['NO_MATCH', 'http_request'] }])).toBeFalsy();
    expect(filterEvent(event, [{ categories: ['NO_MATCH', 'web'] }])).toBeFalsy();
    expect(filterEvent(event, [{ types: ['NO_MATCH', 'access'] }])).toBeFalsy();
    expect(filterEvent(event, [{ outcomes: ['NO_MATCH', 'success'] }])).toBeFalsy();
    expect(filterEvent(event, [{ spaces: ['NO_MATCH', 'default'] }])).toBeFalsy();
    expect(filterEvent(event, [{ users: ['NO_MATCH', 'jdoe'] }])).toBeFalsy();
  });

  test('keeps event when one criteria per rule does not match', () => {
    expect(
      filterEvent(event, [
        {
          actions: ['NO_MATCH'],
          categories: ['web'],
          types: ['access'],
          outcomes: ['success'],
          spaces: ['default'],
          users: ['jdoe'],
        },
        {
          actions: ['http_request'],
          categories: ['NO_MATCH'],
          types: ['access'],
          outcomes: ['success'],
          spaces: ['default'],
          users: ['jdoe'],
        },
        {
          actions: ['http_request'],
          categories: ['web'],
          types: ['NO_MATCH'],
          outcomes: ['success'],
          spaces: ['default'],
          users: ['jdoe'],
        },
        {
          actions: ['http_request'],
          categories: ['web'],
          types: ['access'],
          outcomes: ['NO_MATCH'],
          spaces: ['default'],
          users: ['jdoe'],
        },
        {
          actions: ['http_request'],
          categories: ['web'],
          types: ['access'],
          outcomes: ['success'],
          spaces: ['NO_MATCH'],
          users: ['jdoe'],
        },
        {
          actions: ['http_request'],
          categories: ['web'],
          types: ['access'],
          outcomes: ['success'],
          spaces: ['default'],
          users: ['NO_MATCH'],
        },
      ])
    ).toBeTruthy();
  });

  test('keeps event when one item per category does not match', () => {
    event = {
      message: 'this is my audit message',
      event: {
        action: 'http_request',
        category: ['authentication', 'web'],
        type: ['access'],
        outcome: 'success',
      },
      user: {
        name: 'jdoe',
      },
      kibana: {
        space_id: 'default',
      },
    };

    expect(
      filterEvent(event, [
        {
          actions: ['http_request'],
          categories: ['web', 'NO_MATCH'],
          types: ['access'],
          outcomes: ['success'],
          spaces: ['default'],
          users: ['jdoe'],
        },
      ])
    ).toBeTruthy();
  });

  test('keeps event when one item per type does not match', () => {
    event = {
      message: 'this is my audit message',
      event: {
        action: 'http_request',
        category: ['web'],
        type: ['access', 'user'],
        outcome: 'success',
      },
      user: {
        name: 'jdoe',
      },
      kibana: {
        space_id: 'default',
      },
    };

    expect(
      filterEvent(event, [
        {
          actions: ['http_request'],
          categories: ['web'],
          types: ['access', 'NO_MATCH'],
          outcomes: ['success'],
          spaces: ['default'],
          users: ['jdoe'],
        },
      ])
    ).toBeTruthy();
  });

  test('filters out event when all criteria in a single rule match', () => {
    expect(
      filterEvent(event, [
        {
          actions: ['NO_MATCH'],
          categories: ['NO_MATCH'],
          types: ['NO_MATCH'],
          outcomes: ['NO_MATCH'],
          spaces: ['NO_MATCH'],
          users: ['NO_MATCH'],
        },
        {
          actions: ['http_request'],
          categories: ['web'],
          types: ['access'],
          outcomes: ['success'],
          spaces: ['default'],
          users: ['jdoe'],
        },
      ])
    ).toBeFalsy();
  });

  test('filters out event when all categories match', () => {
    event = {
      message: 'this is my audit message',
      event: {
        action: 'http_request',
        category: ['authentication', 'web'],
        type: ['access'],
        outcome: 'success',
      },
      user: {
        name: 'jdoe',
      },
      kibana: {
        space_id: 'default',
      },
    };

    expect(
      filterEvent(event, [
        {
          actions: ['http_request'],
          categories: ['authentication', 'web'],
          types: ['access'],
          outcomes: ['success'],
          spaces: ['default'],
          users: ['jdoe'],
        },
      ])
    ).toBeFalsy();
  });

  test('filters out event when all types match', () => {
    event = {
      message: 'this is my audit message',
      event: {
        action: 'http_request',
        category: ['web'],
        type: ['access', 'user'],
        outcome: 'success',
      },
      user: {
        name: 'jdoe',
      },
      kibana: {
        space_id: 'default',
      },
    };

    expect(
      filterEvent(event, [
        {
          actions: ['http_request'],
          categories: ['web'],
          types: ['access', 'user'],
          outcomes: ['success'],
          spaces: ['default'],
        },
      ])
    ).toBeFalsy();
  });
});
