import { prisma } from "@/lib/db";

const TTL_MS = 5 * 60 * 1000;

export const WEBAUTHN_CHALLENGE_REGISTRATION = "registration";
export const WEBAUTHN_CHALLENGE_AUTHENTICATION = "authentication";

export async function purgeExpiredWebAuthnChallenges(): Promise<void> {
  await prisma.webAuthnChallenge.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
}

export function webauthnChallengeExpiresAt(): Date {
  return new Date(Date.now() + TTL_MS);
}
