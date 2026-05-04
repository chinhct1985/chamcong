import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  purgeExpiredWebAuthnChallenges,
  WEBAUTHN_CHALLENGE_AUTHENTICATION,
  webauthnChallengeExpiresAt,
} from "@/lib/webauthn-challenge";
import { webauthnOrigin, webauthnRpId } from "@/lib/webauthn-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Bắt đầu đăng nhập passkey (usernameless / resident key).
 * Chỉ nên gọi từ client iOS đã đăng ký passkey trước đó.
 */
export async function POST(request: NextRequest) {
  const hasAnyPasskey = await prisma.userWebAuthnCredential.findFirst({
    select: { id: true },
  });
  if (!hasAnyPasskey) {
    return NextResponse.json(
      {
        error:
          "Chưa có tài khoản nào đăng ký Face ID. Đăng nhập bằng mật khẩu và bật Face ID trong trang chấm công.",
      },
      { status: 400 }
    );
  }

  await purgeExpiredWebAuthnChallenges();

  const rpID = webauthnRpId(request);
  const origin = webauthnOrigin(request);

  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "required",
  });

  const row = await prisma.webAuthnChallenge.create({
    data: {
      challenge: options.challenge,
      kind: WEBAUTHN_CHALLENGE_AUTHENTICATION,
      userId: null,
      expiresAt: webauthnChallengeExpiresAt(),
    },
  });

  return NextResponse.json({
    challengeId: row.id,
    options,
    expectedOrigin: origin,
  });
}
