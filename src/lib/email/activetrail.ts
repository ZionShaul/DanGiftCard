const ACTIVETRAIL_BASE = "https://webapi.mymarketing.co.il/api";

/**
 * Send a transactional email via ActiveTrail Operational Message API.
 * @param templateId - The Operational Message ID from ActiveTrail dashboard
 * @param toEmail    - Recipient email address
 * @param parameters - Merge variables matching $$variable$$ placeholders in the template
 */
export async function sendActiveTrailEmail(
  templateId: number,
  toEmail: string,
  parameters: Record<string, string>
): Promise<void> {
  if (!templateId) {
    console.warn(`[ActiveTrail] templateId is 0 – skipping send to ${toEmail}`);
    return;
  }

  const apiKey = process.env.ACTIVETRAIL_API_KEY ?? "";
  if (!apiKey) {
    console.warn("[ActiveTrail] ACTIVETRAIL_API_KEY is not set – skipping email send");
    return;
  }

  const res = await fetch(`${ACTIVETRAIL_BASE}/OperationalMessage/Message`, {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      operational_message_id: templateId,
      email: toEmail,
      parameters,
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`[ActiveTrail] error ${res.status}: ${err}`);
  }
}

/**
 * Read a numeric template ID from environment variables.
 * Returns 0 (skipped with warning) if the env var is missing or invalid.
 */
export function getTemplateId(envVar: string): number {
  const val = process.env[envVar];
  if (!val) {
    console.warn(`[ActiveTrail] env var ${envVar} is not set`);
    return 0;
  }
  const id = parseInt(val, 10);
  if (isNaN(id)) {
    console.warn(`[ActiveTrail] env var ${envVar} is not a valid number: "${val}"`);
    return 0;
  }
  return id;
}
