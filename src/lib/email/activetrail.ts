const ACTIVETRAIL_BASE = "https://webapi.mymarketing.co.il/api";

/**
 * Send a transactional email via ActiveTrail OperationalMessage API.
 *
 * Correct request format (discovered from API docs):
 * {
 *   email_package: [{ email, pairs: [{key, value}] }],
 *   details: { name, subject, classification },
 *   design: { template_id, body_part_format: 1, add_Statistics: false }
 * }
 *
 * Merge variables in the template use $$key$$ syntax.
 * pairs[].key corresponds to the part between $$ in the template.
 */
export async function sendActiveTrailEmail(
  templateId: number,
  toEmail: string,
  parameters: Record<string, string>,
  subject: string = "הודעה ממשקי דן"
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

  const pairs = Object.entries(parameters).map(([key, value]) => ({ key, value }));

  const body = JSON.stringify({
    email_package: [{ email: toEmail, pairs }],
    details: {
      name: subject,
      subject,
      classification: "אישי",
    },
    design: {
      template_id: templateId,
      body_part_format: 1,
      add_Statistics: false,
    },
  });

  console.error("[ActiveTrail] POST to", toEmail, "templateId:", templateId, "subject:", subject);

  const res = await fetch(`${ACTIVETRAIL_BASE}/OperationalMessage/Message`, {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
    },
    body,
  });

  const responseText = await res.text().catch(() => res.statusText);
  console.error("[ActiveTrail] response status:", res.status, "body:", responseText);

  if (!res.ok) {
    throw new Error(`[ActiveTrail] error ${res.status}: ${responseText}`);
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
