import { SignJWT, jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.APPROVAL_TOKEN_SECRET ?? "fallback-secret-change-in-production"
);

const EXPIRY = "7d"; // 7 days for signatory approval links

export async function createApprovalToken(orderId: string, signatoryId: string): Promise<string> {
  return new SignJWT({ orderId, signatoryId, type: "approval" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(SECRET);
}

export async function verifyApprovalToken(
  token: string
): Promise<{ orderId: string; signatoryId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    if (payload.type !== "approval") return null;
    return {
      orderId: payload.orderId as string,
      signatoryId: payload.signatoryId as string,
    };
  } catch {
    return null;
  }
}
