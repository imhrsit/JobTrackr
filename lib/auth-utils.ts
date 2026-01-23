import bcrypt from "bcryptjs";
import { getServerSession as getNextAuthServerSession } from "next-auth";
import { authOptions } from "./auth";
import type { Session } from "next-auth";

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

export async function getServerSession(): Promise<Session | null> {
  return await getNextAuthServerSession(authOptions);
}

export async function requireAuth(): Promise<Session> {
  const session = await getServerSession();

  if (!session || !session.user) {
    throw new Error("Unauthorized - You must be logged in to access this resource");
  }

  return session;
}
