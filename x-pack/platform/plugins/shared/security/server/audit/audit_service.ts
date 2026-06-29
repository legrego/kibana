/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { accessSync, constants, mkdirSync } from 'fs';
import { dirname } from 'path';
import { BehaviorSubject, distinctUntilKeyChanged, map } from 'rxjs';

import type {
  AppenderConfigType,
  HttpServiceSetup,
  KibanaRequest,
  Logger,
  LoggerContextConfigInput,
  LoggingServiceSetup,
  ServiceStatus,
} from '@kbn/core/server';
import { ServiceStatusLevels } from '@kbn/core/server';
import type { AuditEvent, AuditLogger, AuditServiceSetup } from '@kbn/security-plugin-types-server';
import type { SpacesPluginSetup } from '@kbn/spaces-plugin/server';

import { httpRequestEvent } from './audit_events';
import type { SecurityLicense, SecurityLicenseFeatures } from '../../common';
import type { ConfigType } from '../config';
import type { SecurityPluginSetup } from '../plugin';

export const ECS_VERSION = '1.6.0';
export const RECORD_USAGE_INTERVAL = 60 * 60 * 1000; // 1 hour
export const DROPPED_EVENT_REPORT_INTERVAL = 5 * 60 * 1000; // 5 minutes

/**
 * Idle appender used to keep the audit logger enabled (at `level: 'info'`) once it enters a
 * degraded state. It never receives writes because degraded events are dropped by the
 * fast-path in `log()` before reaching `this.logger.info()`.
 */
const CONSOLE_FALLBACK_APPENDER: AppenderConfigType = {
  type: 'console',
  layout: {
    type: 'pattern',
    highlight: true,
  },
};

const normalize = <T>(value: T | T[]): T[] => (Array.isArray(value) ? value : [value]);

interface AuditServiceSetupParams {
  license: SecurityLicense;
  config: ConfigType['audit'];
  logging: Pick<LoggingServiceSetup, 'configure'>;
  http: Pick<HttpServiceSetup, 'registerOnPostAuth'>;

  getCurrentUser(
    request: KibanaRequest
  ): ReturnType<SecurityPluginSetup['authc']['getCurrentUser']> | undefined;

  getSID(request: KibanaRequest): Promise<string | undefined>;

  getSpaceId(
    request: KibanaRequest
  ): ReturnType<SpacesPluginSetup['spacesService']['getSpaceId']> | undefined;

  recordAuditLoggingUsage(): void;
}

export class AuditService {
  private logger: Logger;
  /**
   * Logger used for operational diagnostics about the audit service itself (degraded-state
   * warnings, dropped-event reports). Kept separate from `this.logger` (`audit.ecs`) so these
   * messages are never routed into the audit trail's own appender.
   */
  private readonly diagnosticsLogger: Logger;
  private usageIntervalId?: NodeJS.Timeout;
  private droppedEventIntervalId?: NodeJS.Timeout;

  private isAuditDegraded = false;
  private droppedEventCount = 0;
  private degradedError?: Error;
  private auditLogPath?: string;

  /**
   * Reflects whether the audit service is able to write events. Surfaced to administrators via
   * `core.status.set()` in the security plugin's `setup()`.
   */
  public readonly auditStatus$ = new BehaviorSubject<ServiceStatus>({
    level: ServiceStatusLevels.available,
    summary: 'Audit logging is working',
  });

  constructor(_logger: Logger) {
    this.logger = _logger.get('ecs');
    this.diagnosticsLogger = _logger;
  }

  setup({
    license,
    config,
    logging,
    http,
    getCurrentUser,
    getSID,
    getSpaceId,
    recordAuditLoggingUsage,
  }: AuditServiceSetupParams): AuditServiceSetup {
    // Capture the resolved file path (if any) so the runtime error boundary and dropped-event
    // reports can reference it. `createConfig()` resolves the default path before it gets here.
    this.auditLogPath = getFileAppenderPath(config.appender);

    // Pre-flight validation: for file-based appenders, verify the path is writable before
    // configuring the logging system. An unwritable path (e.g. EROFS) would otherwise crash
    // Kibana on the first audit event. See the runtime error boundary in `log()` for the
    // primary safety net.
    const preflight =
      config.enabled && config.appender && this.auditLogPath !== undefined
        ? validateAuditLogPath(this.auditLogPath)
        : { valid: true as const };

    if (preflight.valid) {
      // Configure logging during setup and when license changes
      logging.configure(
        license.features$.pipe(
          distinctUntilKeyChanged('allowAuditLogging'),
          createLoggingConfig(config)
        )
      );
    } else {
      // The configured file appender is unusable. Configure the logger with an idle console
      // appender so `isLoggingEnabled()` stays `true`; events then flow into `log()` where the
      // degraded fast-path drops and counts them instead of crashing on a broken appender.
      logging.configure(
        license.features$.pipe(
          distinctUntilKeyChanged('allowAuditLogging'),
          createLoggingConfig({ ...config, appender: CONSOLE_FALLBACK_APPENDER })
        )
      );
      this.enterDegradedState(preflight.error);
    }

    // Record feature usage at a regular interval if enabled and license allows
    const enabled = !!(config.enabled && config.appender);
    const includeSavedObjectNames = config.include_saved_object_names;

    if (enabled) {
      license.features$.subscribe((features) => {
        clearInterval(this.usageIntervalId!);
        if (features.allowAuditLogging) {
          recordAuditLoggingUsage();
          this.usageIntervalId = setInterval(recordAuditLoggingUsage, RECORD_USAGE_INTERVAL);
          if (this.usageIntervalId.unref) {
            this.usageIntervalId.unref();
          }
        }
      });
    }

    const log = (event: AuditEvent | undefined) => {
      if (!event) {
        return;
      }
      if (this.isAuditDegraded) {
        this.droppedEventCount++;
        return;
      }
      if (filterEvent(event, config.ignore_filters)) {
        const { message, ...eventMeta } = event;
        try {
          this.logger.info(message, eventMeta);
        } catch (error) {
          this.enterDegradedState(error as Error);
          this.droppedEventCount++;
        }
      }
    };

    const isLoggingEnabled = () => {
      return this.logger.isLevelEnabled('info');
    };

    const asScoped = (request: KibanaRequest): AuditLogger => ({
      log: async (event) => {
        if (!event || !isLoggingEnabled()) {
          return;
        }
        const spaceId = getSpaceId(request);
        const user = getCurrentUser(request);
        const sessionId = await getSID(request);
        const forwardedFor = getForwardedFor(request);

        log({
          ...event,
          user:
            (user && {
              id: user.profile_uid,
              name: user.username,
              roles: user.roles as string[],
            }) ||
            event.user,
          kibana: {
            space_id: spaceId,
            session_id: sessionId,
            ...event.kibana,
          },
          trace: { id: request.id },
          client: { ip: request.socket.remoteAddress },
          http: forwardedFor
            ? {
                ...event.http,
                request: {
                  ...event.http?.request,
                  headers: {
                    'x-forwarded-for': forwardedFor,
                  },
                },
              }
            : event.http,
        });
      },
      enabled,
      includeSavedObjectNames,
    });

    http.registerOnPostAuth((request, response, t) => {
      if (request.auth.isAuthenticated && isLoggingEnabled()) {
        asScoped(request).log(httpRequestEvent({ request }));
      }
      return t.next();
    });

    return {
      asScoped,
      withoutRequest: { log, enabled, includeSavedObjectNames },
    };
  }

  stop() {
    clearInterval(this.usageIntervalId!);
    clearInterval(this.droppedEventIntervalId!);
  }

  /**
   * Transitions the audit service into a degraded state: drops all further events, surfaces the
   * problem via status and logs, and starts the periodic dropped-event report. Invoked both by
   * the pre-flight check and the runtime error boundary in `log()`.
   */
  private enterDegradedState(error: Error) {
    this.isAuditDegraded = true;
    this.degradedError = error;

    this.auditStatus$.next({
      level: ServiceStatusLevels.degraded,
      summary: 'Audit logging is enabled but unable to write events',
      detail: this.degradedError.message,
    });

    this.startDroppedEventReporting();

    this.diagnosticsLogger.error(
      `Audit logging is enabled but Kibana was unable to write an audit event (configured path: ${
        this.auditLogPath ?? 'unknown'
      }): ${error.message}. Audit events will not be recorded.`
    );
  }

  /**
   * Periodically reports how many audit events were dropped since the last report. Runs for the
   * lifetime of the process once degraded (there is no in-process recovery). `.unref()` ensures
   * the timer does not keep the process alive during shutdown.
   */
  private startDroppedEventReporting() {
    if (this.droppedEventIntervalId) {
      return;
    }

    this.droppedEventIntervalId = setInterval(() => {
      if (this.droppedEventCount === 0) {
        return;
      }
      const droppedEventCount = this.droppedEventCount;
      this.droppedEventCount = 0;
      this.diagnosticsLogger.warn(
        `Audit logging is degraded: ${droppedEventCount.toLocaleString()} audit events dropped in the last 5 minutes (configured path: ${
          this.auditLogPath ?? 'unknown'
        }).`
      );
    }, DROPPED_EVENT_REPORT_INTERVAL);

    if (this.droppedEventIntervalId.unref) {
      this.droppedEventIntervalId.unref();
    }
  }
}

/**
 * Returns the resolved `fileName` for file-based appenders (`file` / `rolling-file`), or
 * `undefined` for appenders that do not write to the filesystem (e.g. `console`).
 */
function getFileAppenderPath(appender?: AppenderConfigType): string | undefined {
  if (appender && (appender.type === 'file' || appender.type === 'rolling-file')) {
    return appender.fileName;
  }
  return undefined;
}

/**
 * Best-effort writability probe for a file-based audit appender. It replicates the synchronous
 * `mkdirSync` that core's file appenders perform on their first write, and additionally checks the
 * parent directory for write permission to catch `EACCES` when the directory already exists.
 *
 * This deliberately mirrors core's internal appender behavior in:
 *   - src/core/packages/logging/server-internal/src/appenders/file/file_appender.ts
 *   - src/core/packages/logging/server-internal/src/appenders/rolling_file/rolling_file_manager.ts
 * If those files change how they resolve paths or open streams, revisit this probe. There is
 * also an inherent TOCTOU gap (the path may become unwritable after the probe). Both risks are
 * acceptable because the runtime error boundary in `AuditService.log()` is the real safety net.
 *
 * Note: `@kbn/fs` is intentionally not used here. It resolves names into Kibana's data directory
 * (path-traversal protection via `getSafePath`), whereas this probe must target the exact,
 * possibly-absolute path the core appender will use (e.g. `/usr/share/kibana/logs/audit.log`).
 */
export function validateAuditLogPath(
  fileName: string
): { valid: true } | { valid: false; error: Error } {
  try {
    const directory = dirname(fileName);
    mkdirSync(directory, { recursive: true });
    accessSync(directory, constants.W_OK);
    return { valid: true };
  } catch (error) {
    return { valid: false, error: error as Error };
  }
}

export const createLoggingConfig = (config: ConfigType['audit']) =>
  map<Pick<SecurityLicenseFeatures, 'allowAuditLogging'>, LoggerContextConfigInput>((features) => ({
    appenders: {
      auditTrailAppender: config.appender ?? {
        type: 'console',
        layout: {
          type: 'pattern',
          highlight: true,
        },
      },
    },
    loggers: [
      {
        name: 'audit.ecs',
        level: config.enabled && config.appender && features.allowAuditLogging ? 'info' : 'off',
        appenders: ['auditTrailAppender'],
      },
    ],
  }));

/**
 * Evaluates the list of provided ignore rules, and filters out events only
 * if *all* rules match the event.
 *
 * For event fields that can contain an array of multiple values, every value
 * must be matched by an ignore rule for the event to be excluded.
 */
export function filterEvent(
  event: AuditEvent,
  ignoreFilters: ConfigType['audit']['ignore_filters']
) {
  if (ignoreFilters) {
    return !ignoreFilters.some(
      (rule) =>
        (!rule.actions || rule.actions.includes(event.event?.action!)) &&
        (!rule.categories ||
          normalize(event.event?.category)?.every((c) => rule.categories?.includes(c || ''))) &&
        (!rule.types ||
          normalize(event.event?.type)?.every((t) => rule.types?.includes(t || ''))) &&
        (!rule.outcomes || rule.outcomes.includes(event.event?.outcome!)) &&
        (!rule.spaces || rule.spaces.includes(event.kibana?.space_id!)) &&
        (!rule.users || !event.user?.name || rule.users.includes(event.user.name))
    );
  }
  return true;
}

/**
 * Extracts `X-Forwarded-For` header(s) from `KibanaRequest`.
 */
export function getForwardedFor(request: KibanaRequest) {
  const forwardedFor = request.headers['x-forwarded-for'];

  if (Array.isArray(forwardedFor)) {
    return forwardedFor.join(', ');
  }

  return forwardedFor;
}
