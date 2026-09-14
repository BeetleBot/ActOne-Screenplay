import * as Sentry from "@sentry/react";
import { getAppVersion } from "./errorReport";

const SENTRY_DSN = "https://7696788a5ffe5ad8624d5af614fd353d@o4512086681518080.ingest.us.sentry.io/4512086700261376";

export function initSentry(): void {
  Sentry.init({
    dsn: SENTRY_DSN,
    release: `actone@${getAppVersion()}`,
    environment: import.meta.env?.MODE || "production",
    sendDefaultPii: false,
    beforeSend(event) {
      if (import.meta.env?.DEV && import.meta.env?.MODE === "test") {
        return null;
      }
      if (event.request) {
        delete event.request.data;
        delete event.request.cookies;
        delete event.request.headers;
      }
      if (event.user) {
        delete event.user.ip_address;
        delete event.user.username;
        delete event.user.email;
      }
      return event;
    },
  });
}

export function captureExceptionToSentry(err: unknown, extra?: Record<string, unknown>): void {
  Sentry.withScope((scope) => {
    if (extra) {
      scope.setExtras(extra);
    }
    Sentry.captureException(err);
  });
}

export function captureMessageToSentry(message: string, level: Sentry.SeverityLevel = "error", extra?: Record<string, unknown>): void {
  Sentry.withScope((scope) => {
    scope.setLevel(level);
    if (extra) {
      scope.setExtras(extra);
    }
    Sentry.captureMessage(message);
  });
}

export async function sendBugReportFeedback(params: {
  message: string;
  name?: string;
  email?: string;
}): Promise<string> {
  const eventId = Sentry.captureFeedback({
    message: params.message,
    name: params.name,
    email: params.email,
  });

  await Sentry.flush(3000);
  return eventId;
}
