import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "./db";

const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

const COOKIE = "lab_session";
const SESSION_DAYS = 60;
const KEY_LEN = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, KEY_LEN);
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltB64, hashB64] = stored.split("$");
  if (scheme !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64");
  const actual = await scryptAsync(password, Buffer.from(saltB64, "base64"), expected.length);
  return timingSafeEqual(actual, expected);
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Call only from a Server Action or Route Handler: it sets a cookie. */
export async function startSession(memberId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.session.create({ data: { tokenHash: hashToken(token), memberId, expiresAt } });
  // Secure only when the page was served over HTTPS: on a lab machine reached by plain
  // http://<ip>:3000, browsers silently drop a Secure cookie and nobody could sign in.
  const h = await headers();
  const https = (h.get("x-forwarded-proto") ?? new URL(h.get("origin") ?? "http://x").protocol.slice(0, -1)) === "https";
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: https,
    path: "/",
    expires: expiresAt,
  });
}

/** Call only from a Server Action or Route Handler: it deletes a cookie. */
export async function endSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  jar.delete(COOKIE);
}

export type CurrentMember = { id: string; name: string; active: boolean; createdAt: Date };

/** The signed-in member, or null. Cached per request, so pages and actions can both call it. */
export const getCurrentMember = cache(async (): Promise<CurrentMember | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      expiresAt: true,
      member: { select: { id: true, name: true, active: true, createdAt: true } },
    },
  });
  if (!session || session.expiresAt < new Date()) return null;
  return session.member;
});

/**
 * Every page and every Server Action behind the login calls this. A layout check alone is not
 * enough: Server Actions are reachable by a direct POST that never renders the layout.
 */
export async function requireMember(): Promise<CurrentMember> {
  const member = await getCurrentMember();
  if (!member) redirect("/entrar");
  return member;
}
