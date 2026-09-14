import { getAppVersion } from "./errorReport";
import { logger } from "./logger";
import { sendBugReportFeedback } from "./sentry";

export interface BugReportInput {
  name?: string;
  email?: string;
  description: string;
}

function generateBugReportCode(): string {
  const version = getAppVersion();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  const time = Date.now().toString(36).toUpperCase();
  return `BUG-${version}-${time}-${rand}`;
}

export async function sendBugReport(input: BugReportInput): Promise<{ success: boolean; code: string; error?: string }> {
  const code = generateBugReportCode();
  logger.info("bug-report", `Submitting user bug report ${code}`);

  try {
    await sendBugReportFeedback({
      message: input.description.trim(),
      name: input.name?.trim() || undefined,
      email: input.email?.trim() || undefined,
    });

    return { success: true, code };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("bug-report", `Failed to send bug report ${code}`, err);
    return { success: false, code, error: message };
  }
}
