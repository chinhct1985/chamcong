import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { signUserToken } from "@/lib/auth";
import { AUTH_COOKIE_NAME } from "@/lib/constants";
import { userSessionCookieOptions } from "@/lib/cookie-options";
import { prisma } from "@/lib/db";
import { WEBAUTHN_CHALLENGE_AUTHENTICATION } from "@/lib/webauthn-challenge";
import { webauthnOrigin, webauthnRpId } from "@/lib/webauthn-config";
import { webauthnRouteErrorResponse } from "@/lib/webauthn-route-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  challengeId: z.string().min(1),
  credential: z.any(),
});

export async function POST(request: NextRequest) {
  let parsed: z.infer<typeof bodySchema>;
  try {
    const json: unknown = await request.json();
    parsed = bodySchema.parse(json);
  } catch {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  try {
  const challengeRow = await prisma.webAuthnChallenge.findUnique({
    where: { id: parsed.challengeId },
  });

  if (
    !challengeRow ||
    challengeRow.kind !== WEBAUTHN_CHALLENGE_AUTHENTICATION ||
    challengeRow.expiresAt < new Date()
  ) {
    return NextResponse.json(
      { error: "Phiên đăng nhập Face ID hết hạn — thử lại" },
      { status: 400 }
    );
  }

  const credRow = await prisma.userWebAuthnCredential.findUnique({
    where: { credentialId: parsed.credential.id },
    include: { user: { select: { id: true, isActive: true } } },
  });

  if (!credRow || !credRow.user.isActive) {
    return NextResponse.json(
      { error: "Passkey không khớp tài khoản hoặc tài khoản đã khoá" },
      { status: 401 }
    );
  }

  const rpID = webauthnRpId(request);
  const origin = webauthnOrigin(request);

  let verified;
  try {
    verified = await verifyAuthenticationResponse({
      response: parsed.credential as Parameters<
        typeof verifyAuthenticationResponse
      >[0]["response"],
      expectedChallenge: challengeRow.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: credRow.credentialId,
        publicKey: new Uint8Array(credRow.publicKey),
        counter: Number(credRow.counter),
      },
      requireUserVerification: true,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Không xác minh được Face ID — thử lại" },
      { status: 401 }
    );
  }

  if (!verified.verified) {
    return NextResponse.json({ error: "Đăng nhập Face ID thất bại" }, { status: 401 });
  }

  const { authenticationInfo } = verified;

  let token: string;
  try {
    token = await signUserToken(credRow.userId);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Máy chủ chưa cấu hình JWT_SECRET" },
      { status: 500 }
    );
  }

  await prisma.$transaction([
    prisma.webAuthnChallenge.delete({ where: { id: challengeRow.id } }),
    prisma.userWebAuthnCredential.update({
      where: { credentialId: credRow.credentialId },
      data: { counter: BigInt(authenticationInfo.newCounter) },
    }),
  ]);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE_NAME, token, userSessionCookieOptions(request));
  return res;
  } catch (e) {
    return webauthnRouteErrorResponse(e);
  }
}
