import * as jose from "jose";

export type UserJwtPayload = { userId: string; scope: "user" };

export async function signUserToken(userId: string): Promise<string> {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  const key = new TextEncoder().encode(secret);
  return await new jose.SignJWT({ userId, scope: "user" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(key);
}

export async function verifyUserToken(token: string): Promise<UserJwtPayload> {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  const key = new TextEncoder().encode(secret);
  const { payload } = await jose.jwtVerify(token, key, { algorithms: ["HS256"] });
  if (payload.scope !== "user" || typeof payload.userId !== "string") {
    throw new Error("invalid token");
  }
  return { userId: payload.userId, scope: "user" };
}
