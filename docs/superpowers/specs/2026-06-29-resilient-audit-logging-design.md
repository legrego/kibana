# Resilient Audit Logging Design

## Problem

When Kibana's audit logging is enabled but the configured file path is not writable (e.g., EROFS in hardened containers), the `RollingFileAppender` throws a synchronous `EROFS` error from `mkdirSync` on the first audit event. This exception propagates uncaught through the logger's `performLog()` loop, surfaces as an `uncaughtException`, and crashes Kibana into a restart loop.

This caused a high-severity incident (sdh-control-plane#13075) where a missing stackpack configuration left Kibana falling back to its default audit path (`/usr/share/kibana/logs/audit.log`) -- a read-only location in the container. Half the Kibana nodes crash-looped, degrading Task Manager and causing customer-facing unavailability.

## Constraints

- **Audit logging only**: Do not change the behavior of the core logging infrastructure or other log types (server logs, plugin logs). Only the audit logging path gets resilience.
- **No crash**: Kibana must not shut down due to an unwritable audit log path. It should continue serving requests.
- **Administrator visibility**: Administrators must be notified via Kibana's status API (`/api/status` showing `degraded`) and console/server log warnings.
- **Dropped event tracking**: Audit events that cannot be written are dropped, with a periodic count logged to the console.
- **Recovery requires restart**: Recovering audit logging after fixing the underlying issue requires a Kibana restart. SIGHUP-based recovery is not feasible with the current architecture (see "Why not SIGHUP recovery" below).

## Design

### Approach: Audit Service Error Boundary

All changes are scoped to `AuditService` in `x-pack/platform/plugins/shared/security/server/audit/audit_service.ts` and the security plugin's `setup()` in `plugin.ts`. No core logging packages are modified.

### Pre-flight Validation

When `AuditService.setup()` runs and audit logging is enabled with a file-based appender (`type: 'file'` or `type: 'rolling-file'`), we validate writability before configuring the logging system.

**Validation function** (`validateAuditLogPath`):
1. Read `fileName` directly from the already-resolved `config.audit.appender.fileName`. The default path (`path.join(getLogsPath(), 'audit.log')`) is already resolved by `createConfig()` at `config.ts:518-522` before it reaches the audit service -- do not re-derive it.
2. Attempt `mkdirSync` on the parent directory (replicating what the real appender does) and write+unlink a temp probe file
3. Return `{ valid: true }` or `{ valid: false, error: Error }`

**On failure**:
- Do NOT pass the broken file appender to `logging.configure()`. Instead, configure the audit logger at `level: 'info'` with a harmless console appender (the same fallback `createLoggingConfig` already uses when no appender is set). This keeps `isLoggingEnabled()` returning `true` so that events still flow through to the `log()` function, where the `isAuditDegraded` fast-path drops them and increments the counter. The console appender sits idle -- it never receives writes because the fast-path exits before `this.logger.info()` is called.
- Call `this.enterDegradedState(error)`. This is the same method the runtime error boundary calls, and it handles all degraded-state responsibilities: setting `isAuditDegraded`, emitting the degraded status via `auditStatus$`, starting the dropped-event reporting interval, and logging the error message. The pre-flight path should not duplicate a subset of this logic.

**Why not `level: 'off'`**: Setting the logger to `level: 'off'` would cause `isLoggingEnabled()` (which checks `this.logger.isLevelEnabled('info')`) to return `false`. Both `asScoped().log()` and `registerOnPostAuth` gate on `isLoggingEnabled()` before calling `log()`, so events would be silently short-circuited upstream and never reach the `droppedEventCount` increment. The periodic warning would report 0 drops in exactly the pre-flight EROFS scenario.

**Non-file appenders** (e.g., `type: 'console'`) skip validation entirely.

**Coupling and TOCTOU**: The probe replicates core's internal appender behavior (`mkdirSync` + file open). This couples the security plugin to core's undocumented implementation; if core changes how file appenders resolve paths or open streams, the probe silently diverges. There is also a TOCTOU gap: the path may be writable at probe time but not at first write. Both risks are acceptable because the runtime error boundary (Section 2) is the real safety net -- the pre-flight is a best-effort early signal, not the primary defense. Implementation should include a comment in `validateAuditLogPath` pointing at the core appender files it mirrors (`file_appender.ts`, `rolling_file_manager.ts`) so future changes to those files prompt a review of the probe.

### Runtime Error Boundary

The `log()` function inside `AuditService.setup()` is the single entry point for all audit events. We wrap the `this.logger.info()` call in a try-catch:

```typescript
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
      this.enterDegradedState(error);
      this.droppedEventCount++;
    }
  }
};
```

Once degraded, events are dropped immediately via the fast-path check (`this.isAuditDegraded`) without attempting the logger call. This avoids repeated `mkdirSync` throws on every audit event.

### Degraded Status Reporting

**Ownership**: `AuditService` owns a `BehaviorSubject<ServiceStatus>` called `auditStatus$` as a public instance field. The security plugin's `setup()` in `plugin.ts` accesses it directly via `this.auditService.auditStatus$` and wires it into `core.status.set()`. The `AuditServiceSetup` return type (a published contract in `@kbn/security-plugin-types-server`) is not modified -- this is an internal detail that only `plugin.ts` needs.

**In `AuditService`** (new instance field):
```typescript
public readonly auditStatus$ = new BehaviorSubject<ServiceStatus>({
  level: ServiceStatusLevels.available,
  summary: 'Security is working',
});
```

**In `SecurityPlugin.setup()`** (`plugin.ts`):
```typescript
core.status.set(
  combineLatest([core.status.derivedStatus$, this.auditService.auditStatus$]).pipe(
    map(([derivedStatus, auditStatus]) => {
      if (auditStatus.level > derivedStatus.level) {
        return auditStatus;
      }
      return derivedStatus;
    })
  )
);
```

**`enterDegradedState(error)`** is a private method on `AuditService` that:
1. Sets `this.isAuditDegraded = true`
2. Stores the error for reporting: `this.degradedError = error`
3. Emits degraded status: `this.auditStatus$.next({ level: ServiceStatusLevels.degraded, summary: 'Audit logging is enabled but unable to write events', detail: error.message })`
4. Starts the dropped event reporting interval (if not already started)
5. Logs an error to the security logger (not the audit logger): `"Audit logging is enabled but the configured path is not writable: <path> (<error>). Audit events will not be recorded."`

This makes the degraded state visible in `/api/status` and triggers the built-in log: `"Kibana is now degraded: ... security"` (same pattern as Task Manager degradation from the incident).

### Dropped Event Counting

A `setInterval` (5-minute interval) logs the count of dropped events and resets the counter:

```
WARN Audit logging is degraded: 1,247 audit events dropped in the last 5 minutes.
     Audit log path is not writable: /usr/share/kibana/logs/audit.log
```

The interval timer uses `.unref()` so it does not prevent process shutdown (matching the existing `RECORD_USAGE_INTERVAL` pattern in the audit service).

The interval runs for the lifetime of the process once degraded (there is no in-process recovery). The `.unref()` ensures it does not prevent shutdown.

### Recovery Requires Restart

Recovering audit logging after fixing the underlying issue (e.g., remounting the filesystem, fixing permissions, or changing the config to a writable path) requires a full Kibana restart. The degraded state is not automatically recoverable at runtime.

Practical admin workflow:
1. Admin notices degraded status via `/api/status` or console warnings
2. Admin fixes the underlying issue (remount filesystem, fix permissions, or update `kibana.yml` to a writable path)
3. Admin restarts Kibana
4. On startup, pre-flight validation passes, audit logging works normally

### Why Not SIGHUP Recovery

SIGHUP-based recovery was considered but is not feasible with the current architecture for two reasons:

1. **The audit logging config observable does not re-emit on SIGHUP.** `AuditService.setup()` calls `logging.configure()` with an observable derived from `license.features$` (license polling from Elasticsearch). SIGHUP triggers core's config service to re-read `kibana.yml` and re-run the core logging system's `upgrade()`, but the plugin-provided contextual config observable only re-emits when the license changes, not on config reload.

2. **The audit config is a static snapshot.** `AuditService.setup()` receives `config: config.audit` as a value captured at setup time. Even if the plugin subscribes to `config$` and updates its own `this.config`, the audit service holds a closure over the original value. A config change to `xpack.security.audit.appender.fileName` would not be visible to the re-validation logic.

Supporting SIGHUP recovery would require piping `initializerContext.config.create$()` into the audit service and merging it with `license.features$`. This is additional complexity that can be added as a follow-up if needed.

## Files Changed

- `x-pack/platform/plugins/shared/security/server/audit/audit_service.ts` -- primary changes: pre-flight validation, try-catch error boundary, degraded state management, dropped event counting
- `x-pack/platform/plugins/shared/security/server/plugin.ts` -- read `this.auditService.auditStatus$` and wire it into `core.status.set()` (no new parameters passed to `AuditService.setup()`)
- `x-pack/platform/plugins/shared/security/server/audit/audit_service.test.ts` -- new tests for all scenarios

## Testing

### Pre-flight validation tests
- File appender with writable path: audit logging configures normally, `auditStatus$` stays `available`
- File appender with unwritable path (EROFS/EACCES): configured with idle console appender at `level: 'info'`, `enterDegradedState()` called, `auditStatus$` emits `degraded`, dropped event counter increments when events arrive
- Console appender: no validation needed, configures normally
- Audit disabled: no validation, no status change

### Runtime error boundary tests
- `logger.info()` throws: event is dropped, degraded state entered, counter incremented
- Multiple events after degraded: all dropped (fast-path), counter increments
- Dropped event periodic log: after interval fires, count is logged and reset

### Degraded state persistence tests
- Degraded state persists across log events (counter keeps incrementing)
- Degraded status is visible via the `auditStatus$` observable

All tests mock `fs.mkdirSync`/`fs.writeFileSync` for the pre-flight check and use the existing `loggingSystemMock` for the logger.

## What This Does Not Cover

- **Async stream errors**: If the file appender opens successfully but later encounters an async `WriteStream` error (e.g., disk fills up mid-write), the current design does not handle that. The try-catch only catches synchronous errors from `logger.info()`. Handling async stream errors would require changes to the core logging infrastructure (adding `'error'` listeners to `WriteStream`), which is out of scope.
- **Core logging resilience**: This design intentionally does not make all file appenders resilient. Only the audit logging path is protected.
- **Runtime recovery**: There is no automatic or SIGHUP-based recovery. A Kibana restart is required. SIGHUP recovery could be added as a follow-up by piping `config$` into the audit service.
