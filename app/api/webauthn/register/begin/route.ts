import { generateRegistrationOptions } from "@simplewebauthn/server";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getUserIdFromCookie } from "@/lib/session";
import {
  purgeExpiredWebAuthnChallenges,
  WEBAUTHN_CHALLENGE_REGISTRATION,
  webauthnChallengeExpiresAt,
} from "@/lib/webauthn-challenge";
import { webauthnOrigin, webauthnRpId } from "@/lib/webauthn-config";
import { webauthnRouteErrorResponse } from "@/lib/webauthn-route-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromCookie();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true, phone: true, isActive: true },
    });
    if (!user?.isActive) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await purgeExpiredWebAuthnChallenges();

    const rpID = webauthnRpId(request);
    const origin = webauthnOrigin(request);

    const existing = await prisma.userWebAuthnCredential.findMany({
      where: { userId },
      select: { credentialId: true, transports: true },
    });

    const options = await generateRegistrationOptions({
      rpName: "Chấm công",
      rpID,
      userName: user.phone,
      userDisplayName: user.fullName,
      userID: new TextEncoder().encode(user.id),
      attestationType: "none",
      authenticatorSelection: {
        residentKey: "required",
        userVerification: "required",
      },
      excludeCredentials: existing.map((c) => ({
        id: c.credentialId,
      })),
    });

    const row = await prisma.webAuthnChallenge.create({
      data: {
        challenge: options.challenge,
        kind: WEBAUTHN_CHALLENGE_REGISTRATION,
        userId,
        expiresAt: webauthnChallengeExpiresAt(),
      },
    });

    return NextResponse.json({
      challengeId: row.id,
      options,
      /** Gợi ý client kiểm tra origin — Safari iOS cần HTTPS (trừ edge case localhost). */
      expectedOrigin: origin,
    });
  } catch (e) {
    return webauthnRouteErrorResponse(e);
  }
}
