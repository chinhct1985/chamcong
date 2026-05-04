import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getUserIdFromCookie } from "@/lib/session";
import { WEBAUTHN_CHALLENGE_REGISTRATION } from "@/lib/webauthn-challenge";
import { webauthnOrigin, webauthnRpId } from "@/lib/webauthn-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  challengeId: z.string().min(1),
  credential: z.any(),
});

export async function POST(request: NextRequest) {
  const userId = await getUserIdFromCookie();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let parsed: z.infer<typeof bodySchema>;
  try {
    const json: unknown = await request.json();
    parsed = bodySchema.parse(json);
  } catch {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isActive: true },
  });
  if (!user?.isActive) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const challengeRow = await prisma.webAuthnChallenge.findUnique({
    where: { id: parsed.challengeId },
  });

  if (
    !challengeRow ||
    challengeRow.kind !== WEBAUTHN_CHALLENGE_REGISTRATION ||
    challengeRow.userId !== userId ||
    challengeRow.expiresAt < new Date()
  ) {
    return NextResponse.json(
      { error: "Phiên đăng ký Face ID hết hạn — thử lại" },
      { status: 400 }
    );
  }

  const rpID = webauthnRpId(request);
  const origin = webauthnOrigin(request);

  let verified;
  try {
    verified = await verifyRegistrationResponse({
      response: parsed.credential as Parameters<
        typeof verifyRegistrationResponse
      >[0]["response"],
      expectedChallenge: challengeRow.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Không xác minh được Face ID — thử lại" },
      { status: 400 }
    );
  }

  if (!verified.verified) {
    return NextResponse.json({ error: "Đăng ký Face ID thất bại" }, { status: 400 });
  }

  const { credential } = verified.registrationInfo;
  const transports = credential.transports?.length
    ? credential.transports
    : null;

  try {
    await prisma.$transaction([
      prisma.webAuthnChallenge.delete({ where: { id: challengeRow.id } }),
      prisma.userWebAuthnCredential.create({
        data: {
          userId,
          credentialId: credential.id,
          publicKey: Buffer.from(credential.publicKey),
          counter: BigInt(credential.counter),
          transports: transports ?? undefined,
        },
      }),
    ]);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      {
        error:
          "Không lưu được passkey (có thể thiết bị đã đăng ký trước đó)",
      },
      { status: 409 }
    );
  }

  return NextResponse.json({ ok: true });
}
